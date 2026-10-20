#!/usr/bin/env python3
"""Trim the recorded fixtures to what the detection actually reads.

The fixtures record every upstream release and tag of a repository, because
the wrong-line versions are what proves the detection filters them out. Most
of that is dead weight: a repository publishes many lines (trycua/cua has
cuabot-v, agent-v, bench-v, sandbox-v, ... next to the two lines the flakes
track), and only the tracked lines decide the answer.

The trim keeps:
  - every release and tag of the tracked lines (prefix + major), so the
    release floor, the series and the pre-release rules all have their data;
  - the two newest releases and tags of every other line, so a detection that
    picks the wrong line still has something to pick;
  - the assets of the releases of the tracked lines, because the asset check
    looks at the release of a candidate version.

The tracked lines come from the contract in tests/detection/expected.tsv.
Repositories that no flake tracks (the look-alikes a wrong source detection
would pick) are left alone - they are small.

Usage:
    python3 tests/detection/trim-fixtures.py
"""

import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
FIXTURES = os.path.join(HERE, "fixtures")

PREFIX_RE = re.compile(r"^([^0-9]*)")
KEEP_PER_OTHER_LINE = 2


def tracked_lines():
    """repo -> the (prefix, major) lines the contract tracks for it."""
    lines = {}
    path = os.path.join(HERE, "expected.tsv")
    with open(path) as handle:
        for line in handle:
            if line.startswith("#") or line.startswith("flake\t") or not line.strip():
                continue
            fields = line.rstrip("\n").split("\t")
            repo, prefix, major = fields[1], fields[3], int(fields[4])
            lines.setdefault(repo, set()).add((prefix, major))
    return lines


def line_of(tag):
    """The (prefix, major) line a tag belongs to."""
    match = PREFIX_RE.match(tag)
    prefix = match.group(1) if match else ""
    rest = tag[len(prefix) :]
    major = re.match(r"(\d+)", rest)
    return prefix, int(major.group(1)) if major else -1


def group_by_line(items, key):
    """items -> line -> the items of that line, newest first."""
    grouped = {}
    for item in items:
        grouped.setdefault(line_of(key(item)), []).append(item)
    return grouped


def trim(repo, tracked, path):
    with open(path) as handle:
        data = json.load(handle)

    releases = data["releases"]
    release_lines = group_by_line(releases, lambda r: r["tag_name"])
    kept_releases = []
    for line, items in release_lines.items():
        if line in tracked:
            kept_releases.extend(items)
        else:
            kept_releases.extend(items[:KEEP_PER_OTHER_LINE])
    data["releases"] = kept_releases

    tags = data["tags"]
    tag_lines = group_by_line(tags, lambda t: t)
    kept_tags = []
    for line, items in tag_lines.items():
        if line in tracked:
            kept_tags.extend(items)
        else:
            kept_tags.extend(items[:KEEP_PER_OTHER_LINE])
    data["tags"] = kept_tags

    # The assets of a release matter only for the release a candidate version
    # points at: the asset check looks up the release of the candidate, and a
    # candidate is the newest version of its line. The history of a line keeps
    # its releases and tags, not their assets.
    for items in release_lines.values():
        for release in items[1:]:
            release["assets"] = []

    with open(path, "w") as handle:
        json.dump(data, handle, indent=1, sort_keys=True)
    return len(data["releases"]), len(data["tags"])


def main():
    tracked = tracked_lines()
    for filename in sorted(os.listdir(FIXTURES)):
        if not filename.endswith(".json"):
            continue
        owner, name = filename[: -len(".json")].split("__", 1)
        repo = f"{owner}/{name}"
        if repo not in tracked:
            continue
        path = os.path.join(FIXTURES, filename)
        releases, tags = trim(repo, tracked[repo], path)
        print(f"{repo}: {releases} releases, {tags} tags")
    return 0


if __name__ == "__main__":
    sys.exit(main())
