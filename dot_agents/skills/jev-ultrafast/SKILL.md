---
name: jev-ultrafast
description: Drive jev-ultrafast, the TypeSafe-Jev browser agent from the daily pod — run the inspector demo, wire the API keys, connect Chrome via browser-harness, and use the Python library for scripted runs. Use when the user says "jev", "jev-ultrafast", "browser agent", or wants a goal-driven browser automation with the fast operation/target policy.
---

# jev-ultrafast

A browser agent with a dynamic, indexed action space: each observation
produces a numbered element table, TypeSafe's Jev picks an operation
(`CLICK` / `TYPE_TEXT` / `SELECT` / `SCROLL_UP` / `SCROLL_DOWN` /
`WAIT` / `DONE` / `BLOCKED`) and a target element, and a small LLM
writes text only when the operation is `TYPE_TEXT`. One policy request
per decision cycle; no screenshots in the default loop.

Pod package: `jev-ultrafast` (chart `pkgs/j/jev-ultrafast.lua`,
source-pinned to browser-use/jev-ultrafast main@1231850a — upstream
had no release tags at packaging time; prefer the tag tarball when
they cut one).

## What the pod ships

| Command | Job |
| --- | --- |
| `jev` | Local inspector demo — serves `http://127.0.0.1:8766` |
| `browser-harness` | Chrome attach/control CLI (`--doctor` diagnoses) |
| `browser-harness-mcp` | The same harness as an MCP stdio server |

## Run the demo

```bash
# 1. Keys (env-only; the pod carries no secrets)
export TYPESAFE_API_KEY=...        # Jev policy (TypeSafe direct)
export TEXT_MODEL_API_KEY=...      # OpenRouter key for the text helper
                                   # (example model: inception/mercury-2.5,
                                   #  reasoning disabled)

# 2. Start the inspector (it blocks; run it in a lane/background)
jev                                 # → http://127.0.0.1:8766

# 3. Open the URL, "Start demo → Run automatically". The inspector
#    shows numbered elements, operation/target probabilities, and
#    executed actions. "Choose next" pauses before execution.
```

## Chrome is a runtime prerequisite

The agent drives the operator's real Chrome through browser-harness
(CDP). Chrome must run with remote debugging allowed; when prompted,
accept the "allow remote debugging" dialog. Diagnose attachment with:

```bash
browser-harness --doctor
```

No Chrome on the host → the demo hangs at browser attach, not at
policy calls. Check that first when a run stalls.

## Library use (scripted runs)

```python
from jev_ultrafast import Agent

with Agent(
    "https://www.google.com/travel/flights?hl=en",
    "Find one-way flights from Zurich to London on September 20, 2026, "
    "for one adult in economy. Stop when matching flight options are visible.",
) as agent:
    for state in agent.run():
        print(state["elapsed_ms"], state["status"])
```

Run with the pod python3; `PYTHONPATH` already points at the staged
site-packages through the app wrapper. For a fresh checkout instead:
`uv sync`, `cp .env.example .env`, `uv run jev`.

## Environment variables

| Var | Purpose |
| --- | --- |
| `TYPESAFE_API_KEY` | Jev policy calls (TypeSafe direct) |
| `TEXT_MODEL_API_KEY` | Text helper (OpenAI-compatible; OpenRouter in the example) |
| `TEXT_MODEL_BASE_URL` / `TEXT_MODEL` | Point the helper at Gemini / GLM / DeepSeek (the code reads `TEXT_MODEL`, not `TEXT_MODEL_NAME`) |

A missing key surfaces at tool-call time, never at startup.

## Real-site debugging gotchas

Each cost a real run against a live site:

- A backgrounded/occluded Chrome window freezes renderer timers, menu
  mounts, and screenshots — relaunch with occlusion-backgrounding and
  timer-throttling disabled.
- `a[href]` extractors are blind to href-less SPA anchors.
- Page-fingerprint caches that track only inputs/scroll miss DOM changes
  that add buttons — force a re-observe after every action.
- SPA menus toggle on plain `click` events: `el.click()` beats CDP mouse
  pairs.
- Unlabeled inputs need container-text fallback labels; aria-derived field
  mappings can be stale on arrival — verify labels from the DOM.
- Portal-style dialogs (aria contexts misaligned with painted rows):
  extract the real DOM ids from the page HTML, fill by id, and screenshot
  after every fill.

## Ops notes (nau)

- Rebuild locally: `nau build snap -f pkgs/j/jev-ultrafast.lua` needs
  the requires closure — build it on the farm, not on the NixOS host
  (glibc cannot build here; ambient floor lacks bison/python).
- Version bumps: re-pin the commit + sha256 in the chart, keep the
  vendored `uv.lock` authoritative for the wheel closure (deps.pip;
  dev group drops out via the editable-root prod split; pillow rides
  its cp314 manylinux wheel).
- Farm distribution: `nau build-request submit --package
  jev-ultrafast --version <v> --server http://127.0.0.1:17780
  --token-file <tok> --request-by book3`, then drain (see
  nau-farm-ops).
