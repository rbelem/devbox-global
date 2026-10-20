#!/usr/bin/env python3
"""Parse the table `bin/update-flake` prints into a comparable TSV.

Usage:
    python3 tests/detection/parse_table.py <output-file> <rows-file> <skipped-file>

The table pads its columns, and a long SOURCE (e.g.
Dicklesworthstone/destructive_command_guard) pushes the later columns to the
right, so the rows are split on whitespace instead of on fixed offsets: the
status is the remainder of the line because it may carry a reason
("?? (sha-pinned)").
"""

import re
import sys

ANSI = re.compile(r"\x1b\[[0-9;]*m")
HEADER = re.compile(r"^PACKAGE\s+SOURCE\s+INSTALLED\s+LATEST\s+STATUS")
SKIPPED = re.compile(r"^\s*-\s+(\S+)\s*$")


def read_lines(path):
    with open(path, errors="replace") as handle:
        return [ANSI.sub("", line.rstrip("\n")) for line in handle]


def table_rows(lines):
    """The rows of the flake table: (name, source, installed, latest, status)."""
    rows = []
    in_table = False
    for line in lines:
        if HEADER.match(line.strip()):
            in_table = True
            continue
        if not in_table:
            continue
        if line.startswith("═══") or not line.strip():
            break
        fields = line.split()
        if len(fields) < 5 or set(fields[0]) <= {"\u2500"}:
            continue
        name, source, installed, latest = fields[:4]
        rows.append((name, source, installed, latest, " ".join(fields[4:])))
    return rows


def skipped_flakes(lines):
    """The flake directories the script reports as not enabled."""
    skipped = []
    for line in lines:
        match = SKIPPED.match(line)
        if match:
            skipped.append(match.group(1))
    return skipped


def write_lines(path, values):
    with open(path, "w") as handle:
        for value in values:
            handle.write(value + "\n")


def main():
    output, rows_path, skipped_path = sys.argv[1:4]
    lines = read_lines(output)
    write_lines(rows_path, ["\t".join(row) for row in table_rows(lines)])
    write_lines(skipped_path, skipped_flakes(lines))
    return 0


if __name__ == "__main__":
    sys.exit(main())
