#!/usr/bin/env python3
"""Compare the table `bin/update-flake` printed with the detection contract.

Usage:
    python3 tests/detection/compare.py <expected.tsv> <actual-rows.tsv> \\
        <expected-skipped.txt> <actual-skipped.txt>

The contract carries more columns than the table shows (the release line, the
source kind); the columns both sides share are the flake name, the upstream
repository, the installed version, the latest version and the status.
"""

import sys

LABELS = ("source", "installed", "latest", "status")


def read_tsv(path):
    rows = []
    with open(path) as handle:
        for line in handle:
            line = line.rstrip("\n")
            if not line or line.startswith("#"):
                continue
            fields = line.split("\t")
            if fields[0] == "flake":
                continue
            rows.append(fields)
    return rows


def expected_pairs(rows):
    """(flake, repo, installed, latest, status) per contract row."""
    return [(fields[0], fields[1], fields[5], fields[6], fields[7]) for fields in rows]


def read_lines(path):
    with open(path) as handle:
        return [line.strip() for line in handle if line.strip()]


def field_problems(want, got):
    """The per-field differences between one contract row and one table row."""
    problems = []
    for label, want_value, got_value in zip(LABELS, want[1:], got[1:]):
        if want_value != got_value:
            problems.append(
                f"MISMATCH {want[0]} {label}: expected {want_value!r}, got {got_value!r}"
            )
    return problems


def report_rows(expected, actual):
    """Human readable differences between the contract and the table."""
    problems = []
    actual_by_name = {row[0]: row for row in actual}
    for want in expected:
        got = actual_by_name.get(want[0])
        if got is None:
            problems.append(
                f"MISSING  {want[0]}: expected {want[1:]} but the table has no row"
            )
            continue
        problems += field_problems(want, got)
    expected_names = {row[0] for row in expected}
    for got in actual:
        if got[0] not in expected_names:
            problems.append(f"EXTRA    {got[0]}: {got[1:]}")
    return problems


def report_skipped(expected, actual):
    problems = []
    for name in sorted(set(expected) - set(actual)):
        problems.append(f"MISSING  skipped list: {name}")
    for name in sorted(set(actual) - set(expected)):
        problems.append(f"EXTRA    skipped list: {name}")
    return problems


def main():
    expected_path, actual_path, expected_skipped, actual_skipped = sys.argv[1:5]
    expected = expected_pairs(read_tsv(expected_path))
    actual = [tuple(row) for row in read_tsv(actual_path)]

    problems = report_rows(expected, actual)
    problems += report_skipped(read_lines(expected_skipped), read_lines(actual_skipped))

    for problem in problems:
        print(problem)
    if problems:
        print(f"\n{len(problems)} difference(s) against the contract")
        return 1
    print(f"OK: {len(actual)} flake rows match the contract")
    return 0


if __name__ == "__main__":
    sys.exit(main())
