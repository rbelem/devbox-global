# Pi global instructions (loaded by every pi session)

## LLM routing

- All model traffic goes through the local bifrost gateway: provider `bifrost`,
  base URL http://localhost:8081/v1 (apiKey `bifrost-local`). It is already the
  default provider; do not switch to direct providers unless the user asks.
- Bifrost applies failover chains and load-balances across upstreams, so a
  request that fails on one upstream is retried on the next automatically.
- Model IDs are `upstream/model` routes (e.g. `deepseek/deepseek-v4-flash`,
  `zai/glm-5.2`, `kimi-for-coding/k3`, `minimax/MiniMax-M3`). Use `/model` or
  `--models` to cycle.

## Delegation

- ALWAYS use delegate-wave for any request that can be split into independent
  parts, or when the user says "delegate", "fan out", "wave", "parallel", or
  "use the workers".
- Load the `delegate-wave` skill and follow its protocol. Workers are pi
  instances running in herdr panes, all routed through bifrost.
- If the wave harness is not running, start it first with
  `~/.pi/agent/bin/pi-wave up` (bash tool), then dispatch tasks.
- Never keep a request serial when it decomposes into 2+ independent work
  items. Delegating is the default, not the exception.
