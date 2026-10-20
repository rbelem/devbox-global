#!/usr/bin/env python3
"""Offline oracle for the update-flake version detection.

It reads only the recorded GitHub snapshots in tests/detection/fixtures/, so it
shares no code with the shell implementation under test. It is the second
opinion on what "latest" means for a flake:

    line    = <tag prefix> + <major version of the installed version>
    pool    = every upstream version in that line
    latest  = the newest stable version in the pool, or - when the line has no
              stable version at all - the newest pre-release

A version counts as a pre-release when its own name says so (upstream release
flags are unreliable: deepseek-harness publishes "dsh-v0.1.5-rc.3" as a stable
release) or when the release object is flagged as a pre-release.

Usage:
    python3 tests/detection/oracle.py            # verify expected.tsv
    python3 tests/detection/oracle.py --emit     # print the computed table
"""

import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
FIXTURES = os.path.join(HERE, "fixtures")

PRERELEASE_SUFFIX = re.compile(
    r"-(alpha|beta|rc|pre|next|canary|nightly)([.-]?\d+)?$", re.I
)
PRERELEASE_RANK = {"alpha": 1, "beta": 2, "rc": 3, "pre": 1, "next": 1, "canary": 1}


def load(repo):
    owner, name = repo.split("/")
    with open(os.path.join(FIXTURES, f"{owner}__{name}.json")) as handle:
        return json.load(handle)


def numeric_parts(version):
    """Leading numeric groups of a version, e.g. '0.9.92' -> (0, 9, 92)."""
    parts = []
    for chunk in version.split("."):
        match = re.match(r"^(\d+)", chunk)
        if not match:
            break
        parts.append(int(match.group(1)))
    return tuple(parts)


def version_key(version):
    """Order key: numeric groups first, then a pre-release sorts below its release."""
    core = version.split("+")[0]
    match = re.match(r"^(\d+(?:\.\d+)*)(.*)$", core)
    if not match:
        return ((), 2, core)
    numbers = numeric_parts(match.group(1))
    numbers = numbers + (0,) * (3 - len(numbers))
    suffix = match.group(2).lstrip("-.")
    if not suffix:
        rank = 5
    else:
        head = suffix.split(".")[0].split("-")[0].lower()
        rank = PRERELEASE_RANK.get(head, 4)
    return (numbers, rank, suffix)


def is_prerelease(version):
    return bool(PRERELEASE_SUFFIX.search(version.split("+")[0]))


def in_line(version, major):
    """True when a prefix-stripped version belongs to the line's major."""
    parts = numeric_parts(version)
    return bool(parts) and parts[0] == major


def tagged_versions(data, prefix, major):
    """Versions in the line that upstream tagged."""
    found = {}
    for tag in data["tags"]:
        if not tag.startswith(prefix):
            continue
        version = tag[len(prefix) :]
        if in_line(version, major):
            found[version] = None
    return found


def released_versions(data, prefix, major):
    """Versions in the line that upstream published as a release."""
    found = {}
    for release in data["releases"]:
        tag = release["tag_name"]
        if not tag.startswith(prefix):
            continue
        version = tag[len(prefix) :]
        if in_line(version, major):
            found[version] = release["prerelease"]
    return found


def published_at(data, version, prefix):
    """Publication date of the release for a prefix-stripped version."""
    for release in data["releases"]:
        tag = release["tag_name"]
        if tag.startswith(prefix) and tag[len(prefix) :] == version:
            return release["published_at"]
    return None


def major_minor(version):
    """The (major, minor) pair of a version, e.g. '0.2.1-rc.2' -> (0, 2)."""
    parts = numeric_parts(version)
    if not parts:
        return None
    return (parts[0], parts[1] if len(parts) > 1 else 0)


def line_candidates(repo, prefix, major, installed, kind):
    """Upstream versions in the line `prefix` + `major`, with their pre-release flag.

    Three rules, each with a reason:

    1. Release objects are authoritative - they are the versions upstream
       published. A release published BEFORE the installed version is not a
       candidate: microsoft/playwright-cli carries playwright's own releases
       (v0.180.0, 2021) next to the CLI's (v0.1.22, 2026) and the older one
       sorts higher by semver.
    2. Tags extend the release series but never open a new one. A tag inside
       the series (same major.minor as a release) that is newer than what we
       have is a real version upstream tagged without publishing a release for
       it - zvec-ai/zvec-grep tags v0.2.2 but only released v0.2.0.
    3. A flake that downloads a release asset can only use published
       releases - a tag without a release has no asset to download
       (trycua/cua tags cua-driver-rs-v0.37.0 but released v0.36.0).
    """
    data = load(repo)
    releases = released_versions(data, prefix, major)
    tags = tagged_versions(data, prefix, major)

    floor = None
    for release in data["releases"]:
        tag = release["tag_name"]
        if not tag.startswith(prefix):
            continue
        version = tag[len(prefix) :]
        if version == installed:
            floor = release["published_at"]

    candidates = {}
    for version, prerelease in releases.items():
        published = published_at(data, version, prefix)
        if floor and published and published < floor:
            continue
        candidates[version] = prerelease

    if kind != "asset":
        series = {major_minor(v) for v in candidates}
        for version in tags:
            if version in releases:
                continue
            if installed and version_key(version) < version_key(installed):
                continue
            if series and major_minor(version) not in series:
                continue
            candidates[version] = is_prerelease(version)
    return candidates


def latest_in_line(repo, prefix, major, installed, kind):
    """Newest stable version in the line, or the newest pre-release when the line has none."""
    found = line_candidates(repo, prefix, major, installed, kind)
    if not found:
        return None, False
    stable = {v: p for v, p in found.items() if not p}
    pool = stable if stable else found
    newest = max(pool, key=version_key)
    return newest, pool[newest]


def read_expected():
    """Rows of the contract: (flake, repo, prefix, major, installed, latest)."""
    rows = []
    path = os.path.join(HERE, "expected.tsv")
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


def compute(fields):
    """(flake, repo, prefix, major, installed, latest, prerelease) for one row."""
    name, repo, kind, prefix, major, installed = fields[:6]
    major = int(major)
    if repo in ("unknown", "") or kind == "none":
        got, pre = None, False
    else:
        got, pre = latest_in_line(repo, prefix, major, installed, kind)
    return name, repo, kind, prefix, str(major), installed, got or "unknown", pre


def check(fields):
    """Compare one row against the expected latest; returns an error string or None."""
    name, repo, kind, prefix, major, _installed, got, _pre = compute(fields)
    want = fields[6] if len(fields) > 6 else None
    if want is None:
        return f"?? {name:16s} no expected value in expected.tsv"
    if got != want:
        return (
            f"MISMATCH {name:16s} {repo:30s} line={prefix}{major} got={got} want={want}"
        )
    return None


def main():
    emit = "--emit" in sys.argv
    rows = read_expected()
    failures = 0

    for fields in rows:
        if emit:
            row = list(compute(fields))
            row[7] = "pre" if row[7] else "stable"
            print("\t".join(row))
            continue
        error = check(fields)
        if error:
            print(error)
            failures += 1
        else:
            name, repo, kind, prefix, major, _installed, got, _pre = compute(fields)
            print(
                f"ok      {name:16s} {repo:30s} {kind:8s} line={prefix}{major} latest={got}"
            )

    if not emit:
        print(f"\n{('OK' if not failures else str(failures) + ' MISMATCHES')}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
