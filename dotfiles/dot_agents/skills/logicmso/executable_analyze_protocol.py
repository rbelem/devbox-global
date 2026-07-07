#!/usr/bin/env python3
"""
Protocol Analyzer for Saleae Logic MSO captures.

Analyzes digital signal captures to identify timing patterns and help
determine the protocol being used.
"""

import argparse
import sys
from pathlib import Path
from collections import Counter

import numpy as np

try:
    from saleae.mso_api.binary_files import read_file
except ImportError:
    print("Error: saleae-mso-api not installed. Run: pip install saleae-mso-api")
    sys.exit(1)


# Common baud rates and their bit periods in microseconds
COMMON_BAUD_RATES = {
    300: 3333.33,
    1200: 833.33,
    2400: 416.67,
    4800: 208.33,
    9600: 104.17,
    19200: 52.08,
    38400: 26.04,
    57600: 17.36,
    115200: 8.68,
    230400: 4.34,
    460800: 2.17,
    921600: 1.09,
}


def load_capture(file_path: Path) -> tuple:
    """Load a Saleae binary capture file and return transition data."""
    saleae_file = read_file(file_path)

    if not hasattr(saleae_file.contents, 'chunks') or len(saleae_file.contents.chunks) == 0:
        raise ValueError("No digital data chunks found in file")

    chunk = saleae_file.contents.chunks[0]
    times = np.array(chunk.transition_times)

    return {
        'times': times,
        'initial_state': chunk.initial_state,
        'sample_rate': chunk.sample_rate,
        'begin_time': chunk.begin_time,
        'end_time': chunk.end_time,
    }


def analyze_timing(data: dict) -> dict:
    """Analyze timing characteristics of the signal."""
    times = data['times']

    if len(times) < 2:
        return {'error': 'Not enough transitions'}

    durations_s = np.diff(times)
    durations_us = durations_s * 1e6
    durations_ms = durations_s * 1e3

    # Separate HIGH and LOW durations
    initial = data['initial_state']
    high_idx = 0 if initial == 0 else 1
    low_idx = 1 - high_idx

    high_durations_us = durations_us[high_idx::2]
    low_durations_us = durations_us[low_idx::2]

    return {
        'total_transitions': len(times),
        'capture_duration_s': data['end_time'] - data['begin_time'],
        'signal_duration_s': times[-1] - times[0] if len(times) > 0 else 0,
        'initial_state': 'HIGH' if initial else 'LOW',
        'all': {
            'min_us': float(durations_us.min()),
            'max_us': float(durations_us.max()),
            'mean_us': float(durations_us.mean()),
            'std_us': float(durations_us.std()),
        },
        'high': {
            'count': len(high_durations_us),
            'min_us': float(high_durations_us.min()) if len(high_durations_us) > 0 else 0,
            'max_us': float(high_durations_us.max()) if len(high_durations_us) > 0 else 0,
            'mean_us': float(high_durations_us.mean()) if len(high_durations_us) > 0 else 0,
        },
        'low': {
            'count': len(low_durations_us),
            'min_us': float(low_durations_us.min()) if len(low_durations_us) > 0 else 0,
            'max_us': float(low_durations_us.max()) if len(low_durations_us) > 0 else 0,
            'mean_us': float(low_durations_us.mean()) if len(low_durations_us) > 0 else 0,
        },
        'durations_us': durations_us,
        'high_durations_us': high_durations_us,
        'low_durations_us': low_durations_us,
    }


def detect_clusters(durations_us: np.ndarray, tolerance: float = 0.15) -> list:
    """
    Detect clusters of similar durations.

    Returns list of (center_value, count) tuples.
    """
    if len(durations_us) == 0:
        return []

    sorted_durations = np.sort(durations_us)
    clusters = []
    current_cluster = [sorted_durations[0]]

    for dur in sorted_durations[1:]:
        # Check if this duration is within tolerance of current cluster
        cluster_mean = np.mean(current_cluster)
        if abs(dur - cluster_mean) / cluster_mean <= tolerance:
            current_cluster.append(dur)
        else:
            # Save current cluster and start new one
            clusters.append((np.mean(current_cluster), len(current_cluster)))
            current_cluster = [dur]

    # Don't forget the last cluster
    if current_cluster:
        clusters.append((np.mean(current_cluster), len(current_cluster)))

    # Sort by count (most common first)
    clusters.sort(key=lambda x: -x[1])

    return clusters


def guess_protocol(analysis: dict) -> list:
    """
    Attempt to guess the protocol based on timing characteristics.

    Returns list of (protocol_name, confidence, details) tuples.
    """
    guesses = []

    all_min = analysis['all']['min_us']
    all_max = analysis['all']['max_us']
    high_clusters = detect_clusters(analysis['high_durations_us'])
    low_clusters = detect_clusters(analysis['low_durations_us'])

    # Check for UART (look for consistent bit period)
    for baud, period_us in COMMON_BAUD_RATES.items():
        # Check if minimum duration is close to a baud rate bit period
        if 0.7 < all_min / period_us < 1.3:
            # Check if durations are multiples of the bit period
            multiples = analysis['durations_us'] / period_us
            rounded = np.round(multiples)
            error = np.abs(multiples - rounded).mean()
            if error < 0.15:
                guesses.append((
                    f'UART ({baud} baud)',
                    max(0.3, 0.9 - error * 3),
                    f'Bit period ~{period_us:.1f}us'
                ))

    # Check for 1-Wire (reset pulse ~480us, data pulses 1-120us)
    if all_min < 20 and all_max > 400:
        has_reset = any(400 < d < 600 for d in analysis['low_durations_us'])
        has_short = any(d < 20 for d in analysis['durations_us'])
        if has_reset and has_short:
            guesses.append((
                '1-Wire',
                0.6,
                'Detected reset pulses and short data pulses'
            ))

    # Sort by confidence
    guesses.sort(key=lambda x: -x[1])

    return guesses


def print_histogram(durations_us: np.ndarray, bins: int = 20, title: str = "Duration Histogram"):
    """Print a simple ASCII histogram."""
    if len(durations_us) == 0:
        print(f"{title}: No data")
        return

    hist, edges = np.histogram(durations_us, bins=bins)
    max_count = max(hist)

    print(f"\n{title}")
    print("=" * 60)

    for i, count in enumerate(hist):
        left = edges[i]
        right = edges[i + 1]
        bar_len = int(40 * count / max_count) if max_count > 0 else 0
        bar = "#" * bar_len

        # Choose appropriate unit
        if right < 1000:
            label = f"{left:7.1f}-{right:7.1f}us"
        elif right < 1000000:
            label = f"{left/1000:7.2f}-{right/1000:7.2f}ms"
        else:
            label = f"{left/1e6:7.3f}-{right/1e6:7.3f}s"

        print(f"{label} |{bar} ({count})")


def export_csv(data: dict, output_path: Path):
    """Export transitions to CSV file."""
    times = data['times']
    initial = data['initial_state']

    with open(output_path, 'w') as f:
        f.write("index,time_s,state,duration_us\n")

        for i, t in enumerate(times):
            state = (initial + i) % 2
            if i < len(times) - 1:
                dur = (times[i + 1] - t) * 1e6
            else:
                dur = 0
            f.write(f"{i},{t:.9f},{state},{dur:.3f}\n")

    print(f"Exported {len(times)} transitions to {output_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Analyze digital signal captures from Saleae Logic MSO"
    )
    parser.add_argument("file", type=Path, help="Binary capture file (.bin)")
    parser.add_argument("--histogram", action="store_true",
                        help="Show timing histogram")
    parser.add_argument("--bins", type=int, default=20,
                        help="Number of histogram bins (default: 20)")
    parser.add_argument("--export", type=Path, metavar="CSV",
                        help="Export transitions to CSV file")
    parser.add_argument("--clusters", action="store_true",
                        help="Show detected timing clusters")
    parser.add_argument("--raw", action="store_true",
                        help="Show raw duration values")
    parser.add_argument("-n", type=int, default=20,
                        help="Number of raw values to show (default: 20)")

    args = parser.parse_args()

    if not args.file.exists():
        print(f"Error: File not found: {args.file}")
        sys.exit(1)

    try:
        data = load_capture(args.file)
    except Exception as e:
        print(f"Error loading file: {e}")
        sys.exit(1)

    analysis = analyze_timing(data)

    if 'error' in analysis:
        print(f"Error: {analysis['error']}")
        sys.exit(1)

    # Print basic info
    print(f"File: {args.file}")
    print(f"Sample rate: {data['sample_rate']/1e6:.1f} MHz")
    print(f"Capture duration: {analysis['capture_duration_s']:.3f}s")
    print(f"Signal duration: {analysis['signal_duration_s']:.3f}s")
    print(f"Initial state: {analysis['initial_state']}")
    print(f"Total transitions: {analysis['total_transitions']}")
    print()

    # Timing summary
    print("Timing Summary")
    print("-" * 40)
    a = analysis['all']
    print(f"All durations:  min={a['min_us']:.1f}us  max={a['max_us']:.1f}us  mean={a['mean_us']:.1f}us")

    h = analysis['high']
    print(f"HIGH pulses ({h['count']}): min={h['min_us']:.1f}us  max={h['max_us']:.1f}us  mean={h['mean_us']:.1f}us")

    l = analysis['low']
    print(f"LOW gaps ({l['count']}):   min={l['min_us']:.1f}us  max={l['max_us']:.1f}us  mean={l['mean_us']:.1f}us")
    print()

    # Protocol guesses
    guesses = guess_protocol(analysis)
    if guesses:
        print("Protocol Guesses")
        print("-" * 40)
        for name, confidence, details in guesses:
            print(f"  {name} ({confidence*100:.0f}% confidence)")
            print(f"    {details}")
        print()

    # Clusters
    if args.clusters:
        print("Detected Timing Clusters")
        print("-" * 40)

        high_clusters = detect_clusters(analysis['high_durations_us'])
        print("HIGH pulse clusters:")
        for center, count in high_clusters[:5]:
            if center < 1000:
                print(f"  ~{center:.1f}us ({count} occurrences)")
            else:
                print(f"  ~{center/1000:.2f}ms ({count} occurrences)")

        low_clusters = detect_clusters(analysis['low_durations_us'])
        print("LOW gap clusters:")
        for center, count in low_clusters[:5]:
            if center < 1000:
                print(f"  ~{center:.1f}us ({count} occurrences)")
            else:
                print(f"  ~{center/1000:.2f}ms ({count} occurrences)")
        print()

    # Raw values
    if args.raw:
        print(f"First {args.n} Transitions")
        print("-" * 40)
        durations = analysis['durations_us']
        initial = 0 if analysis['initial_state'] == 'LOW' else 1
        for i in range(min(args.n, len(durations))):
            state = "HIGH" if (i + initial) % 2 == 0 else "LOW"
            dur = durations[i]
            if dur < 1000:
                print(f"  [{i:3d}] {state}: {dur:.1f}us")
            else:
                print(f"  [{i:3d}] {state}: {dur/1000:.2f}ms")
        print()

    # Histogram
    if args.histogram:
        print_histogram(analysis['durations_us'], bins=args.bins, title="All Durations")
        print_histogram(analysis['high_durations_us'], bins=args.bins, title="HIGH Pulse Durations")
        print_histogram(analysis['low_durations_us'], bins=args.bins, title="LOW Gap Durations")

    # Export
    if args.export:
        export_csv(data, args.export)


if __name__ == "__main__":
    main()
