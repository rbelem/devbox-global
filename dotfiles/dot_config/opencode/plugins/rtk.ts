import { Plugin } from "@opencode-ai/plugin";
import { execFile } from "node:child_process";

// RTK OpenCode plugin — rewrites commands to use rtk for token savings.
// V2 port. Requires: rtk >= 0.23.0 in PATH.
//
// This is a thin delegating plugin: all rewrite logic lives in `rtk rewrite`,
// which is the single source of truth (src/discover/registry.rs).
// To add or change rewrite rules, edit the Rust registry — not this file.

function run(cmd, args, timeoutMs): Promise<{ ok: boolean; code: number | null; stdout: string }> {
  return new Promise((resolve) => {
    try {
      execFile(cmd, args, { timeout: timeoutMs, encoding: "utf8", windowsHide: true }, (err, stdout) => {
        if (err && typeof (err as NodeJS.ErrnoException).code !== "number") {
          resolve({ ok: false, code: null, stdout: "" });
          return;
        }
        resolve({
          ok: true,
          code: err ? (err as NodeJS.ErrnoException & { code: number }).code : 0,
          stdout: String(stdout ?? ""),
        });
      });
    } catch {
      resolve({ ok: false, code: null, stdout: "" });
    }
  });
}

export default Plugin.define({
  id: "local.rtk",
  setup: async (ctx) => {
    const probe = await run("which", ["rtk"], 5000);
    if (!probe.ok || probe.code !== 0) {
      console.warn("[rtk] rtk binary not found in PATH — plugin disabled");
      return;
    }

    await ctx.tool.hook("execute.before", async (event) => {
      const tool = String(event.tool ?? "").toLowerCase();
      if (tool !== "bash" && tool !== "shell") return;
      const input = event.input;
      if (!input || typeof input !== "object") return;

      const command = input.command;
      if (typeof command !== "string" || command.length === 0) return;

      const result = await run("rtk", ["rewrite", command], 10000);
      if (!result.ok) return; // rtk crashed/timeout — pass through unchanged
      const rewritten = result.stdout.trim();
      if (rewritten && rewritten !== command) {
        input.command = rewritten;
      }
    });
  },
});
