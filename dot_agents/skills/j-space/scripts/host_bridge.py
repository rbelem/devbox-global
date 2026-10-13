#!/usr/bin/env python3
"""Translate one host event from JSON stdin into context and an allow decision.

This is a portable adapter, not automatic registration with any vendor's hooks.
The host forwards context to the agent and honors allow=false before dependent work.
"""
import argparse
import json
import math
from pathlib import Path
import subprocess
import sys

CONTROL = Path(__file__).with_name('control.py')
EVENTS = {
    'before_work': ('tool', 'work'),
    'after_tool': ('tool', None),
    'before_ship': ('checkpoint', 'ship'),
    'handoff': ('handoff', None),
    'failure': ('failure', None),
    'resume': ('resume', None),
    'compact': ('compact', None),
}


def invoke(root, *args, timeout=45):
    result = subprocess.run(
        [sys.executable, str(CONTROL), '--root', str(root), *args],
        capture_output=True, encoding='utf-8', errors='strict', timeout=timeout,
        check=False,
    )
    return result.returncode, '\n'.join(x.strip() for x in (result.stdout, result.stderr) if x.strip())


def handle(root, message, timeout=45):
    if not math.isfinite(timeout) or timeout <= 0:
        raise ValueError('Controller timeout must be finite and positive.')
    if not isinstance(message, dict) or set(message) - {'event', 'agent'}:
        raise ValueError('Expected an object containing only event and optional agent.')
    event, agent = message.get('event'), message.get('agent', 'root')
    if not isinstance(event, str) or event not in EVENTS:
        raise ValueError('Unknown host event.')
    if not isinstance(agent, str) or not agent.strip() or agent.startswith('-'):
        raise ValueError('Expected a nonempty agent ID.')
    pulse, stage = EVENTS[event]
    code, context = invoke(root, 'pulse', '--event', pulse, '--agent', agent, timeout=timeout)
    if code == 0 and stage:
        code, checked = invoke(root, 'check', '--stage', stage, '--agent', agent, timeout=timeout)
        context = '\n\n'.join((context, checked))
    return {'allow': code == 0, 'context': context, 'event': event, 'agent': agent}


def main(argv=None):
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, 'reconfigure'):
            stream.reconfigure(encoding='utf-8', errors='strict')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', default='.', help='Trusted task root selected by the host.')
    parser.add_argument('--timeout-seconds', type=float, default=45,
                        help='Positive timeout per controller subprocess (default: 45); trusted host setting.')
    args = parser.parse_args(argv)
    try:
        raw = sys.stdin.buffer.read(65537)
        if len(raw) > 65536:
            raise ValueError('Host event exceeds 64 KiB.')
        message = json.loads(raw.decode('utf-8-sig'))
        root = Path(args.root).resolve()
        if not root.is_dir():
            raise ValueError('Task root must be an existing directory.')
        response = handle(root, message, timeout=args.timeout_seconds)
    except (ValueError, OSError, subprocess.SubprocessError) as exc:
        response = {'allow': False, 'context': 'BLOCK: ' + str(exc)}
    print(json.dumps(response, ensure_ascii=False))
    return 0 if response['allow'] else 2


if __name__ == '__main__':
    sys.exit(main())
