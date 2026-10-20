#!/usr/bin/env python3
"""Refresh the offline GitHub fixtures used by tests/detection/run.sh.

The detection tests must not touch the network, so every upstream fact the
script reads is snapshotted here into tests/detection/fixtures/<owner>__<repo>.json.

Usage:
    python3 tests/detection/capture-fixtures.py [--repo owner/name ...]

With no arguments it snapshots every repository the enabled flakes track.
"""

import json
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
FIXTURES = os.path.join(HERE, "fixtures")

# Every repository the enabled devbox.d flakes track upstream, plus the
# look-alike inputs a wrong source-detection strategy would pick up. The
# look-alikes are captured on purpose: the test must fail loudly when the
# script picks one of them instead of the real package source.
#
# devbox.d/opencode is not here: the package is disabled in devbox.json, so
# the detection table does not cover it.
REPOS = [
    "alibaba/open-code-review",
    "akinomyoga/ble.sh",
    "Andyyyy64/whichllm",
    "browser-use/browser-harness",
    "colbymchenry/codegraph",
    "deepseek-ai/deepseek-harness",
    "Dicklesworthstone/destructive_command_guard",
    "Dicklesworthstone/skillranker",
    "doclang-project/doclang",
    "docling-project/docling",
    "docling-project/docling-core",
    "docling-project/docling-mcp",
    "earendil-works/pi",
    "evanfaler/steelpy",
    "Fission-AI/OpenSpec",
    "firecrawl/anydoc",
    "firecrawl/cli",
    "firecrawl/pdf-inspector",
    "getagentseal/codeburn",
    "google/highwayhash",
    "llm-as-a-verifier/llm-as-a-verifier",
    "microsoft/playwright-cli",
    "modem-dev/hunk",
    "monozukuri-ai/ezdwg",
    "nix-community/neovim-nightly-overlay",
    "nexu-io/open-design",
    "NousResearch/hermes-agent",
    "NVIDIA/SkillSpector",
    "ogulcancelik/herdr",
    "oxalica/rust-overlay",
    "pbakaus/impeccable",
    "pyproject-nix/pyproject.nix",
    "pyproject-nix/uv2nix",
    "rbelem/devbox-global",
    "rbelem/jev-review",
    "rbelem/jev-ultrafast",
    "rbelem/wigolo",
    "rtk-ai/rtk",
    "safishamsi/graphify",
    "Tencent/BrowserSkill",
    "trycua/cua",
    "usestrix/strix",
    "valkey-io/valkey-search",
    "vercel-labs/agent-browser",
    "vercel-labs/deepsec",
    "vercel-labs/skills",
    "zvec-ai/zvec-grep",
]

# Repositories whose interesting tags have no GitHub release object, so their
# publish date has to come from the commit API instead.
TAG_DATE_REPOS = [
    "zvec-ai/zvec-grep",
]


def gh_pages(endpoint):
    """Return every page of a GitHub API endpoint as one flat list.

    `--paginate --slurp` yields one JSON array per page, so the pages are
    flattened here. Passing `--jq` alongside `--paginate` prints each page
    separately and loses the array shape.
    """
    proc = subprocess.run(
        ["gh", "api", endpoint, "--paginate", "--slurp"],
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        return []
    try:
        pages = json.loads(proc.stdout)
    except json.JSONDecodeError:
        return []
    items = []
    for page in pages:
        items.extend(page)
    return items


def gh_field(endpoint, expr):
    """Run a single jq expression against one API endpoint."""
    proc = subprocess.run(
        ["gh", "api", endpoint, "--jq", expr],
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        return None
    try:
        return json.loads(proc.stdout)
    except json.JSONDecodeError:
        return None


def tag_dates(repo):
    """Publish date per tag, from the commit the tag points at.

    The releases endpoint carries a date for released tags only. Tags that
    were pushed without a release (the opencode v2 line, the zvec-grep
    v0.2.x line) need the commit date to be ordered correctly.
    """
    dates = {}
    refs = gh_pages(f"repos/{repo}/git/matching-refs/tags/v")
    for ref in refs:
        if not isinstance(ref, dict):
            continue
        name = ref.get("ref", "").removeprefix("refs/tags/")
        if not name:
            continue
        sha = ref.get("object", {}).get("sha")
        if not sha:
            continue
        date = gh_field(f"repos/{repo}/commits/{sha}", ".commit.committer.date")
        if date:
            dates[name] = date
    return dates


def snapshot(repo):
    owner, name = repo.split("/")
    releases = gh_pages(f"repos/{repo}/releases?per_page=100")
    if releases is None:
        releases = []
    releases = [
        {
            "tag_name": r.get("tag_name"),
            "prerelease": bool(r.get("prerelease")),
            "draft": bool(r.get("draft")),
            "published_at": r.get("published_at"),
            "assets": [
                {
                    "name": a.get("name"),
                    "browser_download_url": a.get("browser_download_url"),
                }
                for a in r.get("assets", [])
            ],
        }
        for r in releases
        if r.get("tag_name")
    ]
    tags = [
        item["name"]
        for item in gh_pages(f"repos/{repo}/tags?per_page=100")
        if isinstance(item, dict) and item.get("name")
    ]
    meta = gh_field(f"repos/{repo}", "{default_branch: .default_branch}")
    branch = (meta or {}).get("default_branch", "main")
    dates = tag_dates(repo) if repo in TAG_DATE_REPOS else {}

    path = os.path.join(FIXTURES, f"{owner}__{name}.json")
    with open(path, "w") as handle:
        json.dump(
            {
                "repo": repo,
                "default_branch": branch,
                "releases": releases,
                "tags": tags,
                "tag_dates": dates,
            },
            handle,
            indent=1,
            sort_keys=True,
        )
    return repo, len(releases), len(tags), branch


def main():
    args = sys.argv[1:]
    repos = REPOS
    if args:
        repos = [a for a in args if not a.startswith("--")]
    os.makedirs(FIXTURES, exist_ok=True)
    with ThreadPoolExecutor(max_workers=6) as pool:
        for repo, releases, tags, branch in pool.map(snapshot, repos):
            print(f"{repo}\t{releases} releases\t{tags} tags\tbranch={branch}")


if __name__ == "__main__":
    main()
