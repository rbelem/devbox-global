import { Plugin } from "@opencode-ai/plugin";
import { execFile } from "node:child_process";

// dcg-guard: intercepts shell tool calls and consults `dcg`
// (destructive_command_guard) to block destructive commands before they run.
//
// Requires: `dcg` (>=0.6.x) in PATH. Disable by removing this file from
// ~/.config/opencode/plugins/ or by uninstalling dcg.
//
// Block UX: throws from the execute.before hook to surface a tool error to
// the model; the error tells the model to run `dcg explain "<cmd>"` for the
// rule and to ask the user before manual execution.

function run(cmd: string, args: string[], timeoutMs: number): Promise<{ ok: boolean; code: number | null }> {
  return new Promise((resolve) => {
    try {
      execFile(
        cmd,
        args,
        { timeout: timeoutMs, windowsHide: true },
        (err, _stdout, _stderr) => {
          if (err && typeof (err as NodeJS.ErrnoException).code !== "number") {
            // spawn failure / timeout — treat as guard outage
            resolve({ ok: false, code: null });
            return;
          }
          resolve({ ok: true, code: err ? (err as NodeJS.ErrnoException & { code: number }).code : 0 });
        },
      );
    } catch {
      resolve({ ok: false, code: null });
    }
  });
}

export default Plugin.define({
  id: "local.dcg-guard",
  setup: async (ctx) => {
    const probe = await run("which", ["dcg"], 5000);
    if (!probe.ok || probe.code !== 0) {
      console.warn("[dcg-guard] dcg binary not found in PATH — guard disabled");
      return;
    }

    await ctx.tool.hook("execute.before", async (event) => {
      const tool = String(event.tool ?? "").toLowerCase();
      if (tool !== "bash" && tool !== "shell") return;

      const input = event.input as Record<string, unknown> | undefined;
      if (!input || typeof input !== "object") return;

      const command = input.command ?? input.cmd ?? input.script;
      if (typeof command !== "string" || command.length === 0) return;

      const result = await run("dcg", ["test", "-q", command], 10000);
      // dcg crashed/timeout — fail-open (don't block the model on a guard outage)
      if (!result.ok) return;

      if (result.code === 1) {
        const msg =
          `[dcg] BLOCKED destructive command.\n\n` +
          `Command:\n${command}\n\n` +
          `Run \`dcg explain "${command.replace(/`/g, "\\`")}"\` for the matched rule ` +
          `and safer alternatives. If this command is truly required, ask the user ` +
          `for explicit permission and have them run it manually.`;
        throw new Error(msg);
      }
    });
  },
});
