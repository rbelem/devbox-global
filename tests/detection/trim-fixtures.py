#!/usr/bin/env python3
"""Drop the release assets the detection test never looks at.

The recorded fixtures keep every upstream release, because the wrong-line
releases are what proves the detection filters them out. The ASSETS of those
releases are dead weight though: the asset check only ever looks at the
release of a candidate version, and a candidate always sits in the line the
flake tracks. This trims the assets of every release outside the tracked
lines, which keeps the fixtures small enough to commit.

The tracked prefixes come from the contract in tests/detection/expected.tsv.

Usage:
    python3 tests/detection/trim-fixtures.py
"""

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
FIXTURES = os.path.join(HERE, "fixtures")


def tracked_prefixes():
    """repo -> the tag prefixes the contract tracks for it."""
    prefixes = {}
    path = os.path.join(HERE, "expected.tsv")
    with open(path) as handle:
        for line in handle:
            if line.startswith("#") or line.startswith("flake\t") or not line.strip():
                continue
            fields = line.rstrip("\n").split("\t")
            repo, prefix = fields[1], fields[3]
            prefixes.setdefault(repo, set()).add(prefix)
    return prefixes


def trim(repo, prefixes, path):
    with open(path) as handle:
        data = json.load(handle)
    kept = 0
    for release in data["releases"]:
        if any(release["tag_name"].startswith(prefix) for prefix in prefixes):
            kept += 1
            continue
        release["assets"] = []
    with open(path, "w") as handle:
        json.dump(data, handle, indent=1, sort_keys=True)
    return kept, len(data["releases"])


def main():
    prefixes = tracked_prefixes()
    for filename in sorted(os.listdir(FIXTURES)):
        if not filename.endswith(".json"):
            continue
        owner, name = filename[: -len(".json")].split("__", 1)
        repo = f"{owner}/{name}"
        path = os.path.join(FIXTURES, filename)
        if repo not in prefixes:
            continue
        kept, total = trim(repo, prefixes[repo], path)
        print(f"{repo}: kept assets on {kept}/{total} releases")
    return 0


if __name__ == "__main__":
    sys.exit(main())
