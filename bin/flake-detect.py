#!/usr/bin/env python3
"""Version detection for bin/update-flake.

The update machinery (bumping the version attribute, resetting the hashes,
resolving them, refreshing flake.lock) stays in bash. This file only answers
the question the table asks:

    for every enabled flake, which upstream repository is the pinned version
    compared against, which release line does it belong to, and what is the
    newest version upstream published in that line?

The rules are the ones written down in tests/detection/README.md. The
"newest version in a release line" computation is the one in
tests/detection/oracle.py (ported here, not imported: the oracle lives under
tests/ and must stay an independent second opinion).

Usage:
    flake-detect.py --global-dir ~/.local/share/devbox/global/current

Output: one TSV line per enabled flake on stdout. Empty fields are written
as "-" because bash collapses runs of tabs when splitting a line (an empty
field would silently shift every later column).
"""

import argparse
import json
import os
import re
import subprocess
import sys

# The columns of the TSV, in order. bin/update-flake reads them positionally.
COLUMNS = [
    "flake",  # the devbox.d entry name (may carry a "#variant")
    "repo",  # the repository the version is compared against
    "origin",  # the repository detected in the flake file itself
    "kind",  # asset | source | registry | none
    "prefix",  # the upstream tag prefix of the release line
    "major",  # the major version of that line
    "installed_raw",  # the version string as the flake pins it
    "installed",  # the same version without the tag prefix (display)
    "latest",  # the newest version upstream published in the line
    "relation",  # up-to-date | older | ahead | unknown
    "reason",  # sha-pinned | dynamic-version | pre | branch | -
    "upstream",  # the "# upstream: owner/repo" comment
    "fork_suffix",  # the "# fork-suffix:" comment
    "branch",  # the "# branch-tracking:" comment
    "input",  # the flake input attribute to re-lock
    "version_source",  # attr | input-url | none
]

EMPTY = "-"

# ───────────────────────────────────────────────────────────── versions ──
# Ported from tests/detection/oracle.py.

PRERELEASE_SUFFIX = re.compile(
    r"-(alpha|beta|rc|pre|next|canary|nightly)([.-]?\d+)?$", re.I
)
PRERELEASE_RANK = {
    "alpha": 1,
    "beta": 2,
    "rc": 3,
    "pre": 1,
    "next": 1,
    "canary": 1,
}


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
    """True when the version's own name marks it as a pre-release."""
    return bool(PRERELEASE_SUFFIX.search(version.split("+")[0]))


def in_line(version, major):
    """True when a prefix-stripped version belongs to the line's major."""
    parts = numeric_parts(version)
    return bool(parts) and parts[0] == major


def major_minor(version):
    """The (major, minor) pair of a version, e.g. '0.2.1-rc.2' -> (0, 2)."""
    parts = numeric_parts(version)
    if not parts:
        return None
    return (parts[0], parts[1] if len(parts) > 1 else 0)


def released_versions(releases, prefix, major):
    """The versions in the line that upstream published as a release."""
    found = {}
    for release in releases:
        tag = release.get("tag_name") or ""
        if not tag.startswith(prefix):
            continue
        version = tag[len(prefix) :]
        if in_line(version, major):
            found[version] = bool(release.get("prerelease"))
    return found


def tagged_versions(tags, prefix, major):
    """The versions in the line that upstream tagged."""
    found = {}
    for tag in tags:
        if not tag.startswith(prefix):
            continue
        version = tag[len(prefix) :]
        if in_line(version, major):
            found[version] = None
    return found


def release_floor(releases, prefix, installed):
    """The publication date of the release of the installed version."""
    for release in releases:
        tag = release.get("tag_name") or ""
        if tag.startswith(prefix) and tag[len(prefix) :] == installed:
            return release.get("published_at")
    return None


def published_at(releases, prefix, version):
    """The publication date of the release of a version."""
    for release in releases:
        tag = release.get("tag_name") or ""
        if tag.startswith(prefix) and tag[len(prefix) :] == version:
            return release.get("published_at")
    return None


def extend_with_tags(candidates, released, tagged, installed):
    """Add the tags that extend the series of the releases.

    A tag inside the series (same major.minor as a release) that is newer
    than what we have is a real version upstream tagged without publishing a
    release for it - zvec-ai/zvec-grep tags v0.2.2 but only released v0.2.0.
    """
    series = {major_minor(v) for v in candidates}
    for version in tagged:
        if version in released:
            continue
        if installed and version_key(version) < version_key(installed):
            continue
        if series and major_minor(version) not in series:
            continue
        candidates[version] = is_prerelease(version)
    return candidates


def line_candidates(releases, tags, prefix, major, installed, kind):
    """Upstream versions in the line `prefix` + `major`, with their pre-release flag.

    Three rules, each with a reason:

    1. Release objects are authoritative - they are the versions upstream
       published. A release published BEFORE the installed version is not a
       candidate: microsoft/playwright-cli carries playwright's own releases
       (v0.180.0, 2021) next to the CLI's (v0.1.22, 2026) and the older one
       sorts higher by semver.
    2. Tags extend the release series but never open a new one.
    3. A flake that downloads a release asset can only use published
       releases - a tag without a release has no asset to download
       (trycua/cua tags cua-driver-rs-v0.37.0 but released v0.36.0).
    """
    released = released_versions(releases, prefix, major)
    tagged = tagged_versions(tags, prefix, major)
    floor = release_floor(releases, prefix, installed)

    candidates = {}
    for version, prerelease in released.items():
        stamp = published_at(releases, prefix, version)
        if floor and stamp and stamp < floor:
            continue
        candidates[version] = prerelease

    if kind != "asset":
        extend_with_tags(candidates, released, tagged, installed)
    return candidates


def latest_in_line(releases, tags, prefix, major, installed, kind):
    """Newest stable version in the line, or the newest pre-release when the line has none."""
    found = line_candidates(releases, tags, prefix, major, installed, kind)
    if not found:
        return None, False
    stable = {v: p for v, p in found.items() if not p}
    pool = stable if stable else found
    newest = max(pool, key=version_key)
    return newest, pool[newest]


def compare_versions(latest, installed):
    """How the installed version relates to the newest upstream one."""
    if version_key(latest) > version_key(installed):
        return "older"
    if version_key(latest) < version_key(installed):
        return "ahead"
    return "up-to-date"


# ──────────────────────────────────────────────────────── nix scanning ──
# A small lexer: enough of Nix to find attributes, blocks, inputs and
# comments in the flake files. It understands "..." and ''...'' strings and
# the ${...} interpolation inside them.

ATTR_NAME = r'(?P<name>[A-Za-z_][A-Za-z0-9_.\'-]*|"[^"]*")'
ATTR_RE = re.compile(ATTR_NAME + r"\s*=\s*(?!=)")
IDENT_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_.-]*")
GITHUB_URL_RE = re.compile(r"github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)")
GITHUB_INPUT_RE = re.compile(
    r"github:(?P<owner>[A-Za-z0-9_.-]+)/(?P<repo>[A-Za-z0-9_.-]+)(?:/(?P<ref>[^\"#?]+))?"
)
SHA_RE = re.compile(r"^[0-9a-f]{40}$")
IN_WORD = re.compile(r"\bin\b")
INHERIT_RE = re.compile(r"inherit\b")
WITH_RE = re.compile(r"\s*with\b")
REGISTRY_HOSTS = ("registry.npmjs.org", "files.pythonhosted.org", "pypi.org")
# Attribute names that can carry the versioned artifact.
SOURCE_NAMES = {
    "src",
    "srcorig",
    "main",
    "addon",
    "source",
    "sourcetarball",
    "tarball",
    "binary",
    "package",
}


class Scanner:
    """Splits a Nix file into code (comments blanked) and its structure."""

    def __init__(self, text):
        self.text = text
        self.out = []
        self.pos = 0
        self.comments = []
        self.pairs = {}
        self.in_string = bytearray(len(text))
        self.stack = [["code", 0, 0]]
        self.braces = []
        self.index = 0
        self.line = 1

    def run(self):
        while self.index < len(self.text):
            mode = self.stack[-1][0]
            if mode == "code":
                self.scan_code()
            elif mode == "dq":
                self.scan_dq()
            elif mode == "sq":
                self.scan_sq()
            else:
                self.scan_interp()
        return "".join(self.out), self.comments, self.pairs, self.in_string

    def emit(self, text):
        self.out.append(text)
        self.pos += len(text)

    def blank_comment(self):
        stop = self.text.find("\n", self.index)
        if stop < 0:
            stop = len(self.text)
        self.comments.append((self.line, self.text[self.index + 1 : stop].strip()))
        self.emit(" " * (stop - self.index))
        self.index = stop

    def scan_code(self):
        char = self.text[self.index]
        if char == '"':
            self.emit(char)
            self.stack.append(["dq", 0, 0])
            self.index += 1
        elif self.text[self.index : self.index + 2] == "''":
            self.emit("''")
            self.stack.append(["sq", 0, 0])
            self.index += 2
        elif char == "#":
            self.blank_comment()
        elif char == "{":
            self.braces.append(self.pos)
            self.emit(char)
            self.index += 1
        elif char == "}":
            if self.braces:
                self.pairs[self.braces.pop()] = self.pos
            self.emit(char)
            self.index += 1
        else:
            if char == "\n":
                self.line += 1
            self.emit(char)
            self.index += 1

    def scan_dq(self):
        if self.text[self.index : self.index + 2] == "${":
            self.emit("${")
            self.stack.append(["interp", "dq", 0])
            self.index += 2
            return
        char = self.text[self.index]
        self.emit(char)
        self.in_string[self.index] = 1
        if char == "\\" and self.index + 1 < len(self.text):
            self.emit(self.text[self.index + 1])
            self.in_string[self.index + 1] = 1
            self.index += 2
            return
        if char == '"':
            self.stack.pop()
            self.index += 1
            return
        if char == "\n":
            self.line += 1
        self.index += 1

    def scan_sq(self):
        three = self.text[self.index : self.index + 3]
        if three == "'''":
            self.emit(three)
            self.mark_string(3)
            self.index += 3
            return
        if three == "''$":
            self.emit("''$")
            self.mark_string(3)
            self.index += 3
            return
        if self.text[self.index : self.index + 2] == "''":
            self.emit("''")
            self.mark_string(2)
            self.stack.pop()
            self.index += 2
            return
        if self.text[self.index : self.index + 2] == "${":
            self.emit("${")
            self.stack.append(["interp", "sq", 0])
            self.index += 2
            return
        char = self.text[self.index]
        if char == "\n":
            self.line += 1
        self.emit(char)
        self.in_string[self.index] = 1
        self.index += 1

    def scan_interp(self):
        char = self.text[self.index]
        if char == "{":
            self.stack[-1][2] += 1
        elif char == "}":
            if self.stack[-1][2] == 0:
                self.emit(char)
                self.index += 1
                self.stack.pop()
                return
            self.stack[-1][2] -= 1
        elif char == '"':
            self.emit(char)
            self.stack.append(["dq", 0, 0])
            self.index += 1
            return
        elif self.text[self.index : self.index + 2] == "''":
            self.emit("''")
            self.stack.append(["sq", 0, 0])
            self.index += 2
            return
        elif char == "#":
            self.blank_comment()
            return
        elif char == "\n":
            self.line += 1
        self.emit(char)
        self.index += 1

    def mark_string(self, length):
        for offset in range(length):
            if self.index + offset < len(self.in_string):
                self.in_string[self.index + offset] = 1


def scan(text):
    """(code, comments, brace_pairs, in_string) of a Nix file."""
    return Scanner(text).run()


def find_lets(code, pairs, in_string):
    """The let-scopes of a file: (let, in, end) for every `let ... in`."""
    lets = []
    for match in re.finditer(r"\blet\b", code):
        start = match.start()
        if in_string[start]:
            continue
        stop = matching_in(code, in_string, start)
        if stop is not None:
            lets.append((start, stop, let_end(code, pairs, start)))
    return lets


def matching_in(code, in_string, let_start):
    """The offset of the `in` that closes a `let`."""
    depth = 0
    index = let_start + 3
    while index < len(code):
        char = code[index]
        if in_string[index]:
            index += 1
            continue
        if char in "{([":
            depth += 1
        elif char in "})]":
            depth -= 1
        elif depth == 0 and IN_WORD.match(code, index):
            return index
        index += 1
    return None


def let_end(code, pairs, let_start):
    """Where the scope of a `let` ends: the end of the block it lives in."""
    best = len(code)
    for open_i, close_i in pairs.items():
        if open_i < let_start < close_i and close_i < best:
            best = close_i
    return best


class NixFile:
    """A parsed flake.nix: code without comments, plus the block structure."""

    def __init__(self, text):
        self.code, self.comments, self.pairs, self.in_string = scan(text)
        self.lets = find_lets(self.code, self.pairs, self.in_string)

    def block(self, pos):
        """The innermost { } block containing pos."""
        best = None
        for open_i, close_i in self.pairs.items():
            if open_i < pos < close_i:
                if best is None or (close_i - open_i) < (self.pairs[best] - best):
                    best = open_i
        return best

    def scopes(self, pos):
        """The lexical scopes containing pos, innermost first.

        A scope is (marker, attribute start, attribute end, region end). The
        marker orders the scopes: the one that starts last is the innermost.
        A `let` scope covers its bindings AND its body, so the marker is the
        `let` itself and the attributes are the bindings before the `in`.
        """
        scopes = []
        for open_i, close_i in self.pairs.items():
            if open_i < pos < close_i:
                scopes.append((open_i, open_i + 1, close_i, close_i))
        for let_i, in_i, end_i in self.lets:
            if let_i < pos < end_i:
                scopes.append((let_i, let_i + 3, in_i, end_i))
        scopes.sort(key=lambda scope: -scope[0])
        return scopes

    def attrs(self, scope):
        """The top-level attributes of a scope: name -> (value, offset)."""
        return block_attrs(self.code, self.in_string, scope[1], scope[2])[0]


def block_attrs(code, in_string, start, end):
    """The top-level attributes of the region code[start:end], and the inherits."""
    attrs = {}
    inherits = []
    index = start
    depth = 0
    while index < end:
        char = code[index]
        if in_string[index]:
            index += 1
            continue
        if char in "([{":
            depth += 1
            index += 1
            continue
        if char in ")]}":
            depth -= 1
            index += 1
            continue
        if depth != 0:
            index += 1
            continue
        found = attribute_at(code, in_string, index, end)
        if found:
            name, value, value_start, stop = found
            attrs[name] = (value, value_start)
            index = stop + 1
            continue
        inherited = inherit_at(code, in_string, index, end)
        if inherited:
            names, stop = inherited
            inherits.extend(names)
            index = stop + 1
            continue
        index += 1
    return attrs, inherits


def attribute_at(code, in_string, index, end):
    """The attribute that starts at index: (name, value, value offset, end)."""
    match = ATTR_RE.match(code, index)
    if not match:
        return None
    name = match.group("name")
    if name.startswith('"'):
        name = name[1:-1]
    value_start = match.end()
    stop = value_end(code, in_string, value_start, end)
    return (name, code[value_start:stop].strip(), value_start, stop)


def inherit_at(code, in_string, index, end):
    """The names an `inherit` statement pulls in, and where it ends."""
    if not INHERIT_RE.match(code, index):
        return None
    stop = index
    while stop < end and not (code[stop] == ";" and not in_string[stop]):
        stop += 1
    statement = code[index:stop]
    names = re.sub(r"\([^)]*\)", " ", statement[len("inherit") :])
    return (names.split(), stop)


def value_end(code, in_string, start, limit):
    """The offset of the ';' that ends an attribute value."""
    index = start
    depth = 0
    first = True
    while index < limit:
        char = code[index]
        if in_string[index]:
            index += 1
            continue
        if char in "([{":
            depth += 1
        elif char in ")]}":
            if depth == 0:
                return index
            depth -= 1
        elif char == ";" and depth == 0:
            if first and WITH_RE.match(code, start):
                # `meta = with final.lib; { ... };` - the ';' of the `with`
                # clause is part of the value, not the end of it.
                first = False
                index += 1
                continue
            return index
        index += 1
    return limit


def expr_block(nix, text, offset):
    """The block a value expression opens, if any: (block_start, block_end)."""
    brace = text.find("{")
    if brace < 0:
        return None
    global_brace = offset + brace
    if global_brace not in nix.pairs:
        return None
    return (global_brace, nix.pairs[global_brace])


def resolve_expression(nix, text, offset, scopes, depth=0):
    """Resolve a value expression to the block it names.

    Handles an inline block, a call whose argument is a block, and a plain
    identifier that names a binding in an enclosing scope.
    """
    if depth > 4:
        return None
    stripped = text.strip()
    if not stripped:
        return None
    lead = len(text) - len(text.lstrip())
    if stripped.startswith("{"):
        brace = offset + lead
        if brace in nix.pairs:
            return (brace, nix.pairs[brace])
        return None
    if IDENT_RE.fullmatch(stripped):
        for scope in scopes:
            attrs = nix.attrs(scope)
            if stripped in attrs:
                value, value_offset = attrs[stripped]
                return resolve_expression(nix, value, value_offset, scopes, depth + 1)
        return None
    return expr_block(nix, stripped, offset + lead)


def find_attribute(nix, scopes, name):
    """The value of an attribute, searched through the scopes inner to outer."""
    for scope in scopes:
        attrs = nix.attrs(scope)
        if name in attrs:
            return attrs[name]
    return None


# ──────────────────────────────────────────────────────── flake facts ──

COMMENTS = {
    "upstream": re.compile(r"^upstream:\s*(\S+)"),
    "fork-suffix": re.compile(r"^fork-suffix:\s*(\S+)"),
    "release-prefix": re.compile(r"^release-prefix:\s*(\S+)"),
    "branch-tracking": re.compile(r"^branch-tracking:\s*(\S+)"),
}


def parse_comments(comments):
    """The '# upstream:', '# fork-suffix:', ... directives of a flake."""
    found = {}
    for _line, text in comments:
        for key, pattern in COMMENTS.items():
            if key in found:
                continue
            match = pattern.match(text)
            if match:
                found[key] = match.group(1)
    return found


def inputs_block(nix):
    """The attribute set that holds the flake's inputs."""
    match = re.search(r"\binputs\s*=", nix.code)
    if not match:
        return None
    start = match.end()
    stop = value_end(nix.code, nix.in_string, start, len(nix.code))
    return expr_block(nix, nix.code[start:stop], start)


def input_entry(nix, name, value, offset):
    """One flake input: (name, owner, repo, ref) or None."""
    input_name = name
    if name.count(".") == 1:
        input_name = name.split(".")[0]
    url = None
    if value.startswith('"'):
        url = value.strip('"')
    else:
        inner = expr_block(nix, value, offset)
        if inner:
            inner_attrs = nix.attrs((0, inner[0] + 1, inner[1]))
            if "url" in inner_attrs:
                url = inner_attrs["url"][0].strip('"')
    if not url:
        return None
    github = GITHUB_INPUT_RE.match(url)
    if not github:
        return None
    return (
        input_name,
        github.group("owner"),
        github.group("repo"),
        github.group("ref") or "",
    )


def parse_inputs(nix):
    """The github inputs of a flake."""
    block = inputs_block(nix)
    if block is None:
        return []
    attrs = nix.attrs((0, block[0] + 1, block[1]))
    entries = []
    for name, (value, offset) in attrs.items():
        entry = input_entry(nix, name, value, offset)
        if entry:
            entries.append(entry)
    return entries


def pick_input(inputs, flake):
    """The input that carries the source of a flake."""
    for entry in inputs:
        if entry[0] == flake or entry[0].startswith(flake + "-"):
            return entry
    for entry in inputs:
        if entry[2] == flake:
            return entry
    for entry in inputs:
        if entry[0] != "nixpkgs":
            return entry
    return None


def is_source_name(name):
    """True when an attribute name can carry the versioned artifact."""
    if name.startswith("src"):
        return True
    if name in SOURCE_NAMES:
        return True
    return "url" in name


def source_candidates(nix, scopes):
    """The expressions that may carry the versioned artifact, inner first."""
    candidates = []
    for scope in scopes:
        attrs = nix.attrs(scope)
        for name, (value, offset) in attrs.items():
            lowered = name.lower()
            if lowered.startswith("inputs.") or lowered.startswith("outputs."):
                continue
            if not is_source_name(lowered):
                continue
            candidates.append((value, offset))
    return candidates


def literal_urls(text):
    return re.findall(r"https?://[^\s\"']+", text)


def classify_urls(text):
    """Classify a source expression by the URLs it carries."""
    for url in literal_urls(text):
        if "/releases/download/" in url:
            github = GITHUB_URL_RE.search(url)
            if github:
                return ("asset", github.group(1), github.group(2))
            return ("asset", None, None)
        if any(host in url for host in REGISTRY_HOSTS):
            return ("registry", None, None)
        github = GITHUB_URL_RE.search(url)
        if github:
            # A github URL that is not a release asset: a source tarball.
            return ("source", github.group(1), github.group(2))
    return None


def classify_identifier(nix, stripped, scopes, inputs, depth):
    """Follow an identifier to the binding it names and classify that."""
    if not IDENT_RE.fullmatch(stripped):
        return None
    for scope in scopes:
        attrs = nix.attrs(scope)
        if stripped in attrs:
            value, offset = attrs[stripped]
            return classify_source(nix, value, offset, scopes, inputs, depth + 1)
    for entry in inputs:
        if entry[0] == stripped:
            return ("source", entry[1], entry[2])
    return None


def classify_source(nix, text, offset, scopes, inputs, depth=0):
    """What kind of source an expression is, and which repository it points at."""
    if depth > 4:
        return None
    stripped = text.strip()
    found = classify_urls(stripped)
    if found:
        return found
    if "fetchPypi" in stripped:
        return ("registry", None, None)
    if "fetchFromGitHub" in stripped or "fetchgit" in stripped:
        owner, repo = github_attrs(nix, stripped, offset, scopes)
        return ("source", owner, repo)
    return classify_identifier(nix, stripped, scopes, inputs, depth)


def github_block(nix, text, offset):
    """The { } block of a fetchFromGitHub-style call."""
    marker = text.find("fetchFromGitHub")
    if marker < 0:
        marker = text.find("fetchgit")
    if marker < 0:
        return None
    return expr_block(nix, text[marker:], offset + marker)


def attr_value(nix, scopes, attrs, inherits, name):
    """The value of an attribute of a block, following an `inherit`."""
    if name in attrs:
        value = attrs[name][0]
        return value.strip('"') if value.startswith('"') else None
    if name in inherits:
        found = find_attribute(nix, scopes, name)
        if found:
            return found[0].strip('"')
    return None


def github_attrs(nix, text, offset, scopes):
    """The owner/repo of a fetchFromGitHub-style call."""
    block = github_block(nix, text, offset)
    if not block:
        return (None, None)
    attrs, inherits = block_attrs(nix.code, nix.in_string, block[0] + 1, block[1])
    owner = attr_value(nix, scopes, attrs, inherits, "owner")
    repo = attr_value(nix, scopes, attrs, inherits, "repo")
    return (owner, repo)


def github_rev(nix, text, offset, scopes):
    """The rev of a fetchFromGitHub-style call, following an `inherit`."""
    block = github_block(nix, text, offset)
    if not block:
        return None
    attrs, inherits = block_attrs(nix.code, nix.in_string, block[0] + 1, block[1])
    if "rev" in attrs:
        value = attrs["rev"][0]
        if value.startswith('"'):
            return value.strip('"')
        found = find_attribute(nix, scopes, value.strip())
        return found[0].strip('"') if found else None
    if "rev" in inherits:
        found = find_attribute(nix, scopes, "rev")
        return found[0].strip('"') if found else None
    return None


def find_homepage(nix, scopes):
    """The github homepage of the flake's own package."""
    for scope in scopes:
        attrs = nix.attrs(scope)
        if "meta" not in attrs:
            continue
        value, offset = attrs["meta"]
        block = expr_block(nix, value, offset)
        if not block:
            continue
        inner = nix.attrs((0, block[0] + 1, block[1]))
        if "homepage" not in inner:
            continue
        github = GITHUB_URL_RE.search(inner["homepage"][0].strip('"'))
        if github:
            return (github.group(1), github.group(2))
    return (None, None)


def is_sha(value):
    return bool(SHA_RE.match(value.strip().strip('"')))


def sha_pinned_expression(nix, text, offset, scopes, depth=0):
    """True when the expression pins the source to a commit SHA."""
    if depth > 4:
        return False
    stripped = text.strip()
    if "fetchFromGitHub" in stripped:
        rev = github_rev(nix, stripped, offset, scopes)
        if rev is not None:
            return is_sha(rev)
    if IDENT_RE.fullmatch(stripped):
        for scope in scopes:
            attrs = nix.attrs(scope)
            if stripped in attrs:
                value, value_offset = attrs[stripped]
                return sha_pinned_expression(
                    nix, value, value_offset, scopes, depth + 1
                )
    return False


def detect_sha_pin(nix, scopes, candidates, source_input):
    """True when the flake's source is pinned to a commit SHA."""
    for value, offset in candidates:
        if sha_pinned_expression(nix, value, offset, scopes):
            return True
    if source_input and is_sha(source_input[3]):
        return True
    return False


def prefix_from_download(texts):
    """The tag prefix of a releases/download/<prefix>${version} URL."""
    for text in texts:
        for url in literal_urls(text):
            marker = "/releases/download/"
            if marker not in url:
                continue
            tail = url.split(marker, 1)[1]
            if "${version}" not in tail:
                continue
            head = tail.split("${version}", 1)[0].split("/")[0]
            if head:
                return head
    return None


def prefix_from_rev(texts):
    """The tag prefix of a rev = "<prefix>${version}" attribute."""
    for text in texts:
        for match in re.finditer(r'rev\s*=\s*"([^"$]*)\$\{version\}"', text):
            if match.group(1):
                return match.group(1)
    return None


def prefix_from_version(version_raw):
    """The tag prefix embedded in the version attribute (dsh-v0.2.1 -> dsh-v)."""
    if not version_raw:
        return "v"
    match = re.match(r"^([^0-9]*)(.*)$", version_raw)
    if match and match.group(1):
        return match.group(1)
    return "v"


def detect_prefix(directives, version_raw, candidates):
    """The tag prefix of the release line the flake tracks."""
    if directives.get("release-prefix"):
        return directives["release-prefix"]
    texts = [value for value, _offset in candidates]
    prefix = prefix_from_download(texts)
    if prefix:
        return prefix
    prefix = prefix_from_rev(texts)
    if prefix:
        return prefix
    return prefix_from_version(version_raw)


def split_version(prefix, version_raw, dynamic):
    """The display version (without the tag prefix) and the major version."""
    if not version_raw:
        return ("dynamic" if dynamic else "unknown"), 0
    display = version_raw
    if prefix and version_raw.startswith(prefix) and len(version_raw) > len(prefix):
        display = version_raw[len(prefix) :]
    parts = numeric_parts(display)
    return display, (parts[0] if parts else 0)


def first_source(nix, scopes, candidates, inputs):
    """The first source expression that classifies: (kind, owner, repo)."""
    for value, offset in candidates:
        found = classify_source(nix, value, offset, scopes, inputs)
        if found:
            return found
    return (None, None, None)


def detect_source(nix, scopes, candidates, inputs, source_input):
    """The kind of the flake's source and the repository it names."""
    kind, owner, repo = first_source(nix, scopes, candidates, inputs)
    origin = (owner, repo) if owner and repo else (None, None)
    if kind is None and source_input:
        # The source is a flake input: a git tree, so the kind is "source".
        kind = "source"
        if origin == (None, None):
            origin = (source_input[1], source_input[2])
    return kind, origin


def detect_repo(nix, scopes, directives, inputs, source_input, origin):
    """The repository the version is tracked against."""
    upstream = directives.get("upstream")
    if upstream and "/" in upstream:
        return upstream
    if origin != (None, None):
        return "%s/%s" % origin
    homepage = find_homepage(nix, scopes)
    if homepage != (None, None):
        return "%s/%s" % homepage
    if source_input:
        return "%s/%s" % (source_input[1], source_input[2])
    for entry in inputs:
        return "%s/%s" % (entry[1], entry[2])
    return None


def detect_version(nix, scopes, source_input, candidates):
    """The installed version: (raw version, where it lives, is it dynamic)."""
    found = find_attribute(nix, scopes, "version")
    if found:
        value = found[0]
        if value.startswith('"') and "${" not in value:
            return value.strip('"'), "attr", False
        return "", "none", True
    if source_input and source_input[3]:
        return source_input[3], "input-url", False
    for value, _offset in candidates:
        match = GITHUB_INPUT_RE.search(value)
        if match and match.group("ref"):
            return match.group("ref"), "input-url", False
    return "", "none", False


def comparable(identity):
    """True when the flake has a repository, a version and a kind to compare."""
    return bool(identity["repo"] and identity["display"] and identity["kind"])


def newest_in_line(identity, github):
    """The newest upstream version published in the flake's release line."""
    repo = identity["repo"]
    kind = identity["kind"]
    releases = github.releases(repo)
    # A flake that downloads a release asset can only use published releases,
    # so its tags are never needed.
    tags = [] if kind == "asset" else github.tags(repo)
    return latest_in_line(
        releases,
        tags,
        identity["prefix"],
        identity["major"],
        identity["display"],
        kind,
    )


def detect_status(identity, context, sha_pinned, github):
    """The newest upstream version, how it relates, and why.

    The reason names the blocker:
      dynamic-version - the version attribute is interpolated, so there is
                        nothing to compare.
      sha-pinned      - the source is pinned to a commit SHA: a newer upstream
                        version exists, but the version cannot move without
                        the source moving with it.
      pre             - the newest version in the line is a pre-release.
    """
    if identity["dynamic"]:
        return "unknown", "unknown", "dynamic-version", False
    branch = context["directives"].get("branch-tracking")
    if branch:
        return "branch:%s" % branch, "ahead", "branch", False
    if not comparable(identity):
        return "unknown", "unknown", EMPTY, False
    found, prerelease = newest_in_line(identity, github)
    if not found:
        return "unknown", "unknown", EMPTY, False
    relation = compare_versions(found, identity["display"])
    if relation == "older" and sha_pinned:
        return found, "unknown", "sha-pinned", prerelease
    return found, relation, ("pre" if prerelease else EMPTY), prerelease


# ────────────────────────────────────────────────────────────── github ──


class GitHub:
    """The upstream facts of a repository, fetched with gh and cached."""

    def __init__(self, binary="gh"):
        self.binary = binary
        self.cache = {}

    def api(self, endpoint):
        """The JSON of an API endpoint, or None when it is not available."""
        try:
            proc = subprocess.run(
                [self.binary, "api", endpoint, "--paginate", "--slurp"],
                capture_output=True,
                text=True,
                check=False,
            )
        except OSError:
            return None
        if proc.returncode != 0:
            return None
        try:
            return json.loads(proc.stdout)
        except ValueError:
            return None

    def entry(self, name):
        """The cached facts of a repository."""
        if name not in self.cache:
            self.cache[name] = {"releases": None, "tags": None}
        return self.cache[name]

    def releases(self, name):
        """The releases of a repository; empty when it is unknown.

        A repository without a fixture answers 404: that is "no upstream
        information", not an error.
        """
        entry = self.entry(name)
        if entry["releases"] is None:
            entry["releases"] = as_list(self.api("repos/%s/releases?per_page=100" % name))
        return entry["releases"]

    def tags(self, name):
        """The tags of a repository; empty when it is unknown."""
        entry = self.entry(name)
        if entry["tags"] is None:
            entry["tags"] = tag_names(as_list(self.api("repos/%s/tags?per_page=100" % name)))
        return entry["tags"]


def tag_names(payload):
    """The tag names of a `repos/<owner>/<repo>/tags` answer."""
    names = []
    for item in payload:
        if isinstance(item, dict):
            name = item.get("name")
            if name:
                names.append(name)
        elif isinstance(item, str):
            names.append(item)
    return names


def as_list(payload):
    """gh --paginate --slurp answers with a list of pages; flatten it."""
    if not isinstance(payload, list):
        return []
    if payload and all(isinstance(page, list) for page in payload):
        flat = []
        for page in payload:
            flat.extend(page)
        return flat
    return payload


# ────────────────────────────────────────────────────────────── the run ──


def enabled_flakes(devbox_json):
    """The enabled flake names of a devbox.json (a commented entry is not enabled)."""
    with open(devbox_json) as handle:
        text = handle.read()
    # Drop // comments, but keep the ones inside a string literal (a URL).
    pattern = re.compile(r'"(?:[^"\\]|\\.)*"|//[^\n]*')
    cleaned = pattern.sub(
        lambda m: "" if m.group(0).startswith("//") else m.group(0), text
    )
    data = json.loads(cleaned)
    names = []
    for key in data.get("packages", {}):
        if key.startswith("path:devbox.d/"):
            names.append(key.split("devbox.d/", 1)[1])
    return names


def primary_by_pname(nix, flake):
    """The package whose pname matches the flake name."""
    for match in re.finditer(r'\bpname\s*=\s*"([^"]*)"', nix.code):
        if nix.in_string[match.start()]:
            continue
        if match.group(1) == flake:
            block = nix.block(match.start())
            if block is not None:
                return (block, nix.pairs[block])
    return None


def primary_by_default(nix):
    """The package bound to `default` in the packages attribute set."""
    packages = find_packages_attrset(nix)
    if packages is None:
        return None
    attrs = nix.attrs((0, packages + 1, nix.pairs[packages]))
    if "default" not in attrs:
        return None
    value, offset = attrs["default"]
    scopes = nix.scopes(packages + 1)
    return resolve_expression(nix, value, offset, scopes)


def primary_first(nix):
    """The first package in the file."""
    for match in re.finditer(r'\bpname\s*=\s*"([^"]*)"', nix.code):
        if nix.in_string[match.start()]:
            continue
        block = nix.block(match.start())
        if block is not None:
            return (block, nix.pairs[block])
    return None


def find_primary(nix, flake):
    """The block of the flake's own package."""
    for finder in (
        lambda: primary_by_pname(nix, flake),
        lambda: primary_by_default(nix),
        lambda: primary_first(nix),
    ):
        found = finder()
        if found:
            return found
    return None


def find_packages_attrset(nix):
    """The attribute set that holds the flake's packages."""
    match = re.search(r"\bpackages\s*=", nix.code)
    if not match:
        return None
    start = match.end()
    stop = value_end(nix.code, nix.in_string, start, len(nix.code))
    best = None
    for open_i, close_i in nix.pairs.items():
        if not (start <= open_i < stop):
            continue
        attrs = nix.attrs((0, open_i + 1, close_i))
        if "default" not in attrs:
            continue
        if best is None or (close_i - open_i) < (nix.pairs[best] - best):
            best = open_i
    if best is not None:
        return best
    for open_i, close_i in nix.pairs.items():
        if start <= open_i < stop:
            return open_i
    return None


def detect_context(nix, flake):
    """The directives, the inputs and the scope chain of a flake."""
    primary = find_primary(nix, flake)
    scopes = nix.scopes(primary[0] + 1) if primary else nix.scopes(0)
    inputs = parse_inputs(nix)
    return {
        "directives": parse_comments(nix.comments),
        "inputs": inputs,
        "source_input": pick_input(inputs, flake),
        "scopes": scopes,
        "candidates": source_candidates(nix, scopes),
    }


def detect_identity(nix, context):
    """The repository, the kind and the installed version of a flake."""
    scopes = context["scopes"]
    candidates = context["candidates"]
    kind, origin = detect_source(
        nix, scopes, candidates, context["inputs"], context["source_input"]
    )
    repo = detect_repo(
        nix,
        scopes,
        context["directives"],
        context["inputs"],
        context["source_input"],
        origin,
    )
    version_raw, version_source, dynamic = detect_version(
        nix, scopes, context["source_input"], candidates
    )
    prefix = detect_prefix(context["directives"], version_raw, candidates)
    display, major = split_version(prefix, version_raw, dynamic)
    return {
        "kind": kind,
        "origin": origin,
        "repo": repo,
        "version_raw": version_raw,
        "version_source": version_source,
        "dynamic": dynamic,
        "prefix": prefix,
        "display": display,
        "major": major,
    }


def origin_name(identity):
    """The repository the flake file itself names."""
    origin = identity["origin"]
    if origin != (None, None):
        return "%s/%s" % origin
    return identity["repo"] or "unknown"


def analyze(name, path, github):
    """Everything the table and the update path need to know about a flake."""
    with open(path) as handle:
        nix = NixFile(handle.read())

    flake = name.split("#", 1)[0]
    context = detect_context(nix, flake)
    identity = detect_identity(nix, context)

    sha_pinned = detect_sha_pin(
        nix, context["scopes"], context["candidates"], context["source_input"]
    )
    latest, relation, reason, _prerelease = detect_status(
        identity,
        context,
        sha_pinned,
        github,
    )

    kind = identity["kind"]
    repo = identity["repo"]
    version_raw = identity["version_raw"]
    if not kind or not repo or (not version_raw and not identity["dynamic"]):
        kind = "none"

    origin = identity["origin"]
    return {
        "flake": name,
        "repo": repo or "unknown",
        "origin": origin_name(identity),
        "kind": kind,
        "prefix": identity["prefix"],
        "major": str(identity["major"]),
        "installed_raw": version_raw
        or ("dynamic" if identity["dynamic"] else "unknown"),
        "installed": identity["display"],
        "latest": latest,
        "relation": relation,
        "reason": reason,
        "upstream": context["directives"].get("upstream", EMPTY),
        "fork_suffix": context["directives"].get("fork-suffix", EMPTY),
        "branch": context["directives"].get("branch-tracking", EMPTY),
        "input": context["source_input"][0] if context["source_input"] else EMPTY,
        "version_source": identity["version_source"],
    }


def main():
    parser = argparse.ArgumentParser(description="Detect flake versions.")
    parser.add_argument(
        "--global-dir",
        required=True,
        help="the devbox global directory (holds devbox.json and devbox.d)",
    )
    parser.add_argument(
        "--gh", default="gh", help="the gh binary to query the upstream repositories"
    )
    parser.add_argument(
        "--flake", action="append", default=[], help="only report these flakes"
    )
    args = parser.parse_args()

    devbox_json = os.path.join(args.global_dir, "devbox.json")
    devbox_d = os.path.join(args.global_dir, "devbox.d")

    names = enabled_flakes(devbox_json)
    if args.flake:
        wanted = set(args.flake)
        names = [name for name in names if name in wanted]

    github = GitHub(args.gh)

    print("#" + "\t".join(COLUMNS))
    for name in names:
        path = os.path.join(devbox_d, name.split("#", 1)[0], "flake.nix")
        if not os.path.isfile(path):
            continue
        facts = analyze(name, path, github)
        print("\t".join(str(facts[column]) or EMPTY for column in COLUMNS))
    return 0


if __name__ == "__main__":
    sys.exit(main())
