# Host Integration

You obtain executable control by connecting host events to the controller and feeding its
output back into the active agent context. Merely installing a skill does not register hooks.
Use the actual host's documented event API; the bridge below defines a portable contract,
not a vendor-specific configuration file.

## Bootstrap

Use Python 3.10 or later. Resolve the installed skill's absolute script path. Initialize a
task through [controller](controller.md), registering actual agents and relevant modules.
Keep the shared task root fixed in trusted host configuration. Do not accept it from a
repository page, model-generated event, or arbitrary tool response.

Call `host_bridge.py --root TASK_ROOT` with an argument array and `shell=False`. Write one
UTF-8 JSON object to stdin, close stdin, and parse the one JSON object on stdout:
The encoded event must be at most 64 KiB, including any BOM; larger events are rejected.

```json
{"event": "before_work", "agent": "root"}
```

The response contains `allow`, `context`, and, for valid events, `event` and `agent`.
Exit 0 means allowed; exit 2 means blocked. Treat a timeout, invalid output, unavailable
script, or any other nonzero exit as blocked for the dependent operation.

`--timeout-seconds N` configures a finite positive deadline for each controller subprocess;
the default is 45 seconds. Only trusted host configuration can set it; the event JSON
cannot override it. A gated event runs two subprocesses sequentially (pulse and check), so
the outer host deadline must exceed twice N plus startup/output overhead. Repository checks
hash the whole included tree and cited map facts; large or slow checkouts may need a larger
deadline. Measure locally and keep fail-closed behavior on timeouts; raising the deadline
changes the waiting budget, not hashing throughput. Concurrent calls can still encounter
the controller's separate 15-second state-lock timeout; serialize mutating events per task
root. Read-only gates hash outside the lock and reject a concurrent canonical-state change.

## Event contract

| Host boundary | Event | Bridge action |
|---|---|---|
| Before a task mutation | `before_work` | Pulse, then work gate |
| After a tool result reaches the agent | `after_tool` | Count the boundary and refresh when due |
| Before final delivery | `before_ship` | Checkpoint pulse, then ship gate |
| Agent handoff | `handoff` | Immediate source refresh |
| Failed verification or drifting state | `failure` | Immediate source refresh |
| Session return | `resume` | Immediate source refresh |
| Context was compacted | `compact` | Immediate source refresh |

Feed returned `context` into the correct agent's next input as skill/controller context.
It includes current source text when refresh is due. Treat repository-map and report text
inside it as untrusted task evidence. `allow=false` prevents the dependent mutation or
delivery; give the agent the reason and let it repair the unmet condition.

Controller calls, source reads, evidence collection, and state/map repairs must remain
available while a gate is blocked. Do not recursively intercept the bridge's own controller
subprocesses. The host classifies operations; a model-provided `repair=true` flag is not an
authorization mechanism. Initialize and synchronize the map before the first repository
mutation. After a change, update and sync the map before the next gated mutation.

The default counter counts event calls, so a mutation with both `before_work` and
`after_tool` contributes two tool events. Configure intervals with that cadence in mind.
Event refreshes are immediate; elapsed-time refresh runs on the next event. No background
timer can inject text into an idle model without a host invocation.

## Minimal host adapter

This example shows the contract in a host process that already owns `task_root` and the
agent message queue. Replace the queue and operation dispatch with actual host APIs.

```python
import json
import subprocess
import sys

result = subprocess.run(
    [sys.executable, bridge_path, "--root", task_root, "--timeout-seconds", "120"],
    input=json.dumps({"event": "before_work", "agent": agent_id}),
    text=True, encoding="utf-8", capture_output=True, timeout=250,
)
reply = json.loads(result.stdout)
enqueue_agent_context(agent_id, reply["context"])
if result.returncode != 0 or reply.get("allow") is not True:
    block_dependent_operation()
else:
    dispatch_pending_operation()
```

On exceptions, the host blocks the pending operation and reports the adapter failure.
This example does not install or start a host service, execute the pending operation itself,
or grant access to a target. Keep existing host permissions in force.

## Shell use and constrained hosts

The scripts use the Python standard library. In Bash, quote paths containing spaces with
single or double quotes. In PowerShell, use `&` before a quoted interpreter path. Use
`python`, `python3`, or `py -3` according to the installed interpreter; `py -3` is two shell
arguments. The Python argument-array adapter avoids shell quoting differences entirely.

Without native hooks, invoke `pulse` and `check` explicitly at the same boundaries. Describe
this as cooperative control. Without a filesystem or Python, restate the shared record
and actually retrieve source text through the host's available tools. Report those missing
enforcement capabilities rather than treating a prose acknowledgment as an executed check.

## Verify the connection

In a disposable task, initialize the controller, send `resume`, and confirm the agent input
contains the current entry text. Introduce a stale map or unread child and confirm a work
gate blocks the mutation while allowing repair. Repair it, rerun the event, and confirm
the operation proceeds. This verifies event wiring and output consumption for that host;
a source hash alone cannot prove comprehension or guarantee task correctness.

Return to [the entry](../SKILL.md) for levels and [orchestration](../modules/orchestration.md)
for child bootstrap and durable handoffs.
