import type { Plugin } from "@opencode-ai/plugin";

// dcg-guard: intercepts bash/shell tool calls and consults `dcg`
// (destructive_command_guard) to block destructive commands before they run.
//
// Requires: `dcg` (>=0.6.x) in PATH. Disable by removing the plugin entry
// from opencode.json or by uninstalling dcg.
//
// Block UX: throws from `tool.execute.before` to surface a tool error to the
// model; the error tells the model to run `dcg explain "<cmd>"` for the rule
// and to ask the user before manual execution.

let dcgAvailable = false;

export const DcgGuardPlugin: Plugin = async ({ $ }) => {
  try {
    await $`which dcg`.quiet();
    dcgAvailable = true;
  } catch {
    dcgAvailable = false;
    console.warn("[dcg-guard] dcg binary not found in PATH — guard disabled");
  }

  if (!dcgAvailable) return {};

  return {
    "tool.execute.before": async (input, output) => {
      const tool = String(input?.tool ?? "").toLowerCase();
      if (tool !== "bash" && tool !== "shell") return;

      const args = output?.args;
      if (!args || typeof args !== "object") return;

      const command = (args as Record<string, unknown>).command;
      if (typeof command !== "string" || command.length === 0) return;

      let result;
      try {
        result = await $`dcg test -q ${command}`.quiet().nothrow();
      } catch {
        // dcg crashed/timeout — fail-open (don't block the model on a guard outage)
        return;
      }

      if (result.exitCode === 1) {
        const msg =
          `[dcg] BLOCKED destructive command.\n\n` +
          `Command:\n${command}\n\n` +
          `Run \`dcg explain "${command.replace(/`/g, "\\`")}"\` for the matched rule ` +
          `and safer alternatives. If this command is truly required, ask the user ` +
          `for explicit permission and have them run it manually.`;
        throw new Error(msg);
      }
    },
  };
};
