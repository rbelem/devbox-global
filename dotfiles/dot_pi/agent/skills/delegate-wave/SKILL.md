---
name: delegate-wave
description: Fan work out to parallel pi worker instances running in herdr panes, all routed through the local bifrost gateway. Use whenever the user's request can be split into independent parts, or when the user says delegate / fan out / wave / parallel / use the workers.
---

# Delegate Wave

Orchestrator protocol: break the request into independent work items, dispatch
them to worker pi instances in herdr panes (all models via the `bifrost`
provider), then integrate their results. This cuts latency and spreads cost
across upstreams through bifrost's failover chains.

## Wave topology

- Orchestrator: you (the pi session the user is talking to).
- Workers: non-interactive pi instances running in herdr panes, each pinned to
  a bifrost model, each with an inbox/outbox directory:
  - inbox: `~/.pi-wave/<worker>/in/` (drop `<slug>.task.md` files here)
  - outbox: `~/.pi-wave/<worker>/out/` (`<slug>.out.md` appears when done)
- Worker registry (default lineup from `pi-wave up`):
  - `w1` deepseek/deepseek-v4-flash, max thinking — cheap heavy-lifting, long-form analysis, research passes
  - `w2` kimi-for-coding/k3 — large-context coding and multi-file edits
  - `w3` opencode-go/qwen3.8-max — reasoning specialists, planning, synthesis prep
  - `w4` zai/glm-4.7 — routine/quick tasks (1x quota tier, cheap)

## Steps

1. **Check the harness** (bash tool):
   ```bash
   test -d ~/.pi-wave && ls ~/.pi-wave/*/in >/dev/null 2>&1
   ```
   If workers are missing, start them: `~/.pi/agent/bin/pi-wave up` (creates
   herdr workspace `pi-wave`, one pane per worker). Read its JSON output for
   pane IDs.

2. **Decompose.** Split the request into items that can run truly in parallel
   (no shared mutable state, no ordering dependency). Do not parallelize
   dependent steps. If it cannot be split, just do it directly — no wave.

3. **Assign.** Match each item to a worker by model strength (table above).
   Keep at most one item per worker per wave unless you know a worker is idle.

4. **Dispatch.** For each item, write a self-contained task file with the bash
   tool (use a distinct slug, e.g. `fix-login-1`):
   ```bash
   cat > ~/.pi-wave/w1/in/fix-login-1.task.md <<'TASK'
   <self-contained task: goal, context paths, constraints, definition of done>
   When finished, write your final answer to /tmp/wave-out/fix-login-1.md and
   print the exact line: WAVE_COMPLETE fix-login-1
   TASK
   ```
   Tasks must be self-contained: the worker has its own context (no memory of
   this conversation). Include file paths, exact requirements, and the output
   file path. Ask for file-based answers (write to a path), never long inline
   text — the worker's terminal output is not the result channel.

5. **Wait** (bash tool). Poll until every dispatched slug has an out file:
   ```bash
   for i in $(seq 1 120); do
     ls ~/.pi-wave/*/out/*.out.md 2>/dev/null | grep -q <slug> && break
     sleep 5
   done
   ```
   Do not spin tight loops; 5s sleeps, up to ~10 minutes per wave.

6. **Collect and integrate.** Read each `~/.pi-wave/<worker>/out/<slug>.out.md`,
   verify it actually did what was asked, then synthesize the final answer to
   the user. If a worker failed (error in out file, or timeout), retry that
   item on a different worker model once, or do it yourself.

## Rules

- All worker invocations go through bifrost — never switch a worker to a
  direct provider.
- Verify results before presenting them: check out files exist, outputs were
  actually written, and the answer answers the item.
- One worker per model unless the queue demands more; `pi-wave up` takes extra
  `name:model[:thinking]` args if you need to scale.
- If the user asks for the wave to be torn down, run `~/.pi/agent/bin/pi-wave down`.
