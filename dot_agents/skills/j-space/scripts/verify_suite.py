#!/usr/bin/env python3
"""verify_suite — authoring-time integrity check for the J-Space skill.

Run from anywhere:  <python-command> <skill-root>/scripts/verify_suite.py

Checks, in order of how badly each one breaks the suite:

  1. Exactly one file in the tree carries skill frontmatter. More than one and the
     harness registers more than one command.
  2. The J-Space Premise is byte-identical in SKILL.md, every module and
     the controller; the controller's invariants also match SKILL.md. Verbatim
     recurrence keeps the source anchor consistent with runtime refresh.
  3. Every module and reference is present and reachable from the entry file.
  4. No version talk anywhere in the skill text. The text addresses the model,
     never the maintainer.
  5. Every module carries a drill with a pass and a fail criterion.
  6. All modules carry the same backbone sections, in the same order.
     Extra sections between them are allowed and expected — that is where a
     module says what it is rather than what to do. What must not vary is the
     spine, so every module is navigable the same way.

Exit 0 clean, 1 with findings. Standard library only.
"""

import ast
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

MODULES = [
    "introspection",
    "directed-focus",
    "deep-reasoning",
    "broadcast",
    "capacity",
    "self-monitoring",
    "shorthand",
    "markers",
    "empirics",
    "orchestration",
    "repository",
    "cyber",
    "epistemics",
]
REFERENCES = ["j-space-science", "induction-playbook", "exemplars", "problem-model",
              "engineering-evidence", "controller", "host-integration"]

PREMISE_HEAD = "You do not only produce words; you also think them before"
PREMISE_TAIL = "decodable on demand."

VERSION_TALK = re.compile(
    r"\b(version\s+v?\d+(?:\.\d+)*|v\d+(?:\.\d+)+|old version|new version|"
    r"previous version|earlier version|compared to|now adds|newly added|this release|"
    r"changelog|upgrade[ds]? from)",
    re.I,
)
FRONTMATTER_KEYS = {"name", "description"}

findings = []
read_cache = {}


def fail(where, what):
    findings.append("%s: %s" % (where, what))


def read(path):
    if path not in read_cache:
        try:
            with open(path, encoding="utf-8") as handle:
                read_cache[path] = handle.read()
        except (OSError, UnicodeError) as exc:
            fail(os.path.relpath(path, ROOT), 'cannot read UTF-8 source: ' + str(exc))
            read_cache[path] = ''
    return read_cache[path]


def extract_premise(text, where):
    start = text.find(PREMISE_HEAD)
    if start < 0:
        fail(where, "the premise is missing")
        return None
    end = text.find(PREMISE_TAIL, start)
    if end < 0:
        fail(where, "the premise is truncated")
        return None
    return text[start : end + len(PREMISE_TAIL)]


def extract_invariants(text, where):
    """Read the numbered invariant list and join Markdown continuation lines."""
    heading = "## The invariants"
    start = text.find(heading)
    if start < 0:
        fail(where, "the invariants are missing")
        return None
    block = text[start + len(heading) :]
    next_heading = block.find("\n## ")
    if next_heading >= 0:
        block = block[:next_heading]

    rows = []
    current = None
    for line in block.splitlines():
        numbered = re.match(r"^\d+\.\s+(.*)$", line)
        if numbered:
            if current:
                rows.append(" ".join(current))
            current = [numbered.group(1).strip()]
        elif current is not None and line.startswith((" ", "\t")) and line.strip():
            current.append(line.strip())
        elif current is not None and line.strip():
            break
    if current:
        rows.append(" ".join(current))
    if not rows:
        fail(where, "the invariant list is empty")
        return None
    return rows


def controller_constants(path, where):
    """Read literal controller anchors without importing or executing the script."""
    try:
        tree = ast.parse(read(path), filename=path)
    except (OSError, SyntaxError, UnicodeError) as exc:
        fail(where, "cannot parse controller constants: %s" % exc)
        return {}

    values = {}
    wanted = {"PREMISE", "INVARIANTS"}
    for node in tree.body:
        if not isinstance(node, ast.Assign) or len(node.targets) != 1:
            continue
        target = node.targets[0]
        if not isinstance(target, ast.Name) or target.id not in wanted:
            continue
        try:
            values[target.id] = ast.literal_eval(node.value)
        except (ValueError, TypeError):
            fail(where, "%s must remain a literal" % target.id)
    missing = sorted(wanted - set(values))
    if missing:
        fail(where, "controller anchors missing: %s" % ", ".join(missing))
    return values


def main():
    """Run every check, print the findings, and return the exit code."""
    findings.clear()
    read_cache.clear()
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure:
            try:
                reconfigure(encoding="utf-8", errors="replace")
            except (OSError, ValueError):
                pass

    entry = os.path.join(ROOT, "SKILL.md")
    if not os.path.exists(entry):
        print("SKILL.md not found at " + entry)
        return 1

    # 1 — exactly one frontmatter in the tree
    fronted = []
    for base, _, names in os.walk(ROOT):
        for name in names:
            if not name.endswith(".md"):
                continue
            path = os.path.join(base, name)
            if read(path).startswith("---\n"):
                fronted.append(os.path.relpath(path, ROOT))
    if fronted != ["SKILL.md"]:
        fail("tree", "frontmatter must appear only in SKILL.md, found: %s" % ", ".join(sorted(fronted)))

    # 2 & 3 & 5 — presence, premise, drills
    entry_text = read(entry)
    if entry_text.startswith("---\n"):
        frontmatter = entry_text.split("---\n", 2)[1]
        entries = []
        for line in frontmatter.splitlines():
            match = re.match(r"^([A-Za-z0-9_-]+)\s*:\s*(.*)$", line)
            if match:
                entries.append((match.group(1), match.group(2).strip()))
        keys = {key for key, _ in entries}
        unsupported = sorted(keys - FRONTMATTER_KEYS)
        if unsupported:
            fail("SKILL.md", "unsupported frontmatter keys: %s" % ", ".join(unsupported))
        for required in sorted(FRONTMATTER_KEYS):
            values = [value for key, value in entries if key == required]
            if len(values) != 1:
                fail("SKILL.md", "%s must appear exactly once in frontmatter" % required)
            elif values[0] in ("", "''", '\"\"'):
                fail("SKILL.md", "%s must not be empty" % required)
    canonical = extract_premise(entry_text, "SKILL.md")
    canonical_invariants = extract_invariants(entry_text, "SKILL.md")

    controller_rel = os.path.join("scripts", "jspace.py")
    controller_path = os.path.join(ROOT, controller_rel)
    if not os.path.exists(controller_path):
        fail(controller_rel, "missing")
    else:
        anchors = controller_constants(controller_path, controller_rel)
        if canonical and anchors.get("PREMISE") != canonical:
            fail(controller_rel, "PREMISE differs from SKILL.md — it must be byte-identical")
        if canonical_invariants and anchors.get("INVARIANTS") != canonical_invariants:
            fail(controller_rel, "INVARIANTS differ from SKILL.md")

    for name in MODULES:
        rel = os.path.join("modules", name + ".md")
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            fail(rel, "missing")
            continue
        text = read(path)
        block = extract_premise(text, rel)
        if canonical and block and block != canonical:
            fail(rel, "the premise differs from SKILL.md — it must be byte-identical")
        if "## Drill" not in text:
            fail(rel, "no drill")
        else:
            drill = text.split("## Drill", 1)[1].split("## ", 1)[0]
            if "**Pass:**" not in drill or "**Fail:**" not in drill:
                fail(rel, "the drill has no pass/fail criterion")
        routed = rel.replace(os.sep, "/")
        if routed not in entry_text:
            fail(rel, "not routed to from SKILL.md")
        handoff = text.split('## Hand-off', 1)[-1] if '## Hand-off' in text else ''
        if not re.search(r'\[[^\]\n]+\]\(\.\./SKILL\.md\)', handoff):
            fail(rel, 'Hand-off must link back to ../SKILL.md')
        if re.search(r'`[^`\n]+\.md`', handoff):
            fail(rel, 'Hand-off file routes must use Markdown links, not inline code')

    for name in REFERENCES:
        rel = os.path.join("references", name + ".md")
        if not os.path.exists(os.path.join(ROOT, rel)):
            fail(rel, "missing")
        elif rel.replace(os.sep, "/") not in entry_text:
            fail(rel, "not reachable from SKILL.md")

    # 6 — the same backbone, in the same order, in every module
    backbone = [
        "## The J-Space Premise",
        "## Grounding",
        "## Drills",
        "## Protocol",
        "## Failure modes",
        "## Hand-off",
    ]
    for name in MODULES:
        rel = os.path.join("modules", name + ".md")
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            continue
        heads = [l.strip() for l in read(path).splitlines() if l.startswith("## ")]
        missing = [h for h in backbone if h not in heads]
        if missing:
            fail(rel, "backbone sections missing: %s" % ", ".join(missing))
            continue
        order = [heads.index(h) for h in backbone]
        if order != sorted(order):
            fail(rel, "backbone sections are out of order")

    # 4 — no version talk in anything the model reads
    for base, _, names in os.walk(ROOT):
        for name in sorted(names):
            if not name.endswith(".md"):
                continue
            path = os.path.join(base, name)
            rel = os.path.relpath(path, ROOT)
            for n, line in enumerate(read(path).splitlines(), 1):
                hit = VERSION_TALK.search(line)
                if hit:
                    fail(rel, 'line %d: version talk "%s"' % (n, hit.group(0)))

    # Check the complete installed tree: undeclared resources and broken local
    # Markdown links otherwise evade the fixed entry-route checks above.
    for folder, expected in (("modules", MODULES), ("references", REFERENCES)):
        try:
            names = os.listdir(os.path.join(ROOT, folder))
        except OSError as exc:
            fail(folder, 'cannot list resource directory: ' + str(exc))
            continue
        actual = {os.path.splitext(name)[0] for name in names
                  if name.endswith('.md')}
        if actual != set(expected):
            fail(folder, "resource manifest differs: %s" % sorted(actual.symmetric_difference(expected)))
    for base, dirs, names in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d != '__pycache__']
        for name in names:
            path = os.path.join(base, name)
            if name.endswith('.py'):
                try:
                    ast.parse(read(path), filename=path)
                except (SyntaxError, UnicodeError) as exc:
                    fail(os.path.relpath(path, ROOT), "invalid Python: %s" % exc)
            if not name.endswith('.md'):
                continue
            for target in re.findall(r'\[[^\]\n]+\]\(([^\s)]+)\)', read(path)):
                if '://' in target or target.startswith(('#', 'mailto:')):
                    continue
                target = target.split('#', 1)[0]
                if target and not os.path.exists(os.path.join(base, target)):
                    fail(os.path.relpath(path, ROOT), 'broken local link: ' + target)
    for name in ('control.py', 'host_bridge.py', 'jspace.py', 'verify_suite.py'):
        if not os.path.isfile(os.path.join(ROOT, 'scripts', name)):
            fail('scripts/' + name, 'missing runtime script')

    if findings:
        print("verify_suite: %d finding(s)" % len(findings))
        for f in findings:
            print("  ✗ " + f)
        return 1
    print(
        "verify_suite: clean — one entry, one premise, %d modules, "
        "controller anchors aligned, local links valid, no version talk." % len(MODULES)
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
