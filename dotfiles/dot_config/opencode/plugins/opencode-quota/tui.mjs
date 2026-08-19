// @slkiser/opencode-quota — OpenCode V2 port (TUI side).
// Upstream ships only the V1 plugin API; its quota logic is fully reusable
// through the bundled CLI. This port = toast the CLI output on session.idle.
// Cut vs upstream V1 plugin (ponytail: add back if missed):
//   - sidebar/statusbar panel, /quota dialogs, deferred retries, telemetry,
//     maintainer announcements, config reconciliation
//   - per-session provider filtering (shows all detected providers)
// Upstream V2 release replaces this whole file.
import { Plugin } from "@opencode-ai/plugin/tui";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BIN = join(dirname(fileURLToPath(import.meta.url)), "dist", "bin", "opencode-quota.js");
const THROTTLE_MS = 5 * 60_000; // ponytail: hardcode; wire to experimental.quotaToast if tuning needed
let lastToast = 0;

function runShow() {
  return new Promise((resolve) => {
    let out = "";
    let done = false;
    const finish = (text) => {
      if (!done) {
        done = true;
        resolve(text.trim());
      }
    };
    try {
      const proc = spawn(process.execPath, [BIN, "show"], {
        stdio: ["ignore", "pipe", "pipe"],
        signal: AbortSignal.timeout(60_000),
      });
      proc.stdout.on("data", (c) => (out += c));
      proc.on("error", () => finish(""));
      proc.on("close", () => finish(out));
    } catch {
      finish("");
    }
  });
}

export default Plugin.define({
  id: "local.opencode-quota",
  setup: async (ctx) => {
    try {
      const stream = await ctx.client.event.subscribe();
      void (async () => {
        try {
          for await (const ev of stream) {
            if (ev?.type !== "session.idle") continue;
            const sid = ev.data?.sessionID;
            if (!sid) continue;
            try {
              const s = await ctx.client.session.get({ path: { id: sid } });
              if (s?.data?.parentID) continue; // subagent sessions: no toast spam
            } catch {
              /* assume primary */
            }
            if (Date.now() - lastToast < THROTTLE_MS) continue;
            lastToast = Date.now();
            const text = await runShow();
            if (text) {
              ctx.ui.toast.show({ message: text, duration: 8000 });
            }
          }
        } catch {
          // stream closed (TUI exit)
        }
      })();
    } catch {
      // event stream unavailable — plugin inert
    }
  },
});
