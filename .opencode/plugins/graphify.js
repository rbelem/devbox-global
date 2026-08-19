// graphify OpenCode plugin (V2 port)
// Injects a knowledge graph reminder before shell tool calls when the graph exists.
//
// IMPORTANT: keep the reminder string free of backticks and $(...) constructs.
// The hook prepends `echo "<reminder>" && <cmd>` to the user's shell command;
// backticks inside the double-quoted echo trigger bash command substitution,
// which both corrupts tool output and silently executes the very graphify
// command we are only suggesting. Plain words render fine in opencode's TUI.
import { Plugin } from "@opencode-ai/plugin";
import { existsSync } from "fs";
import { join } from "path";

export default Plugin.define({
  id: "graphify",
  setup: async (ctx) => {
    let reminded = false;

    await ctx.tool.hook("execute.before", (event) => {
      if (reminded) return;
      const tool = String(event.tool ?? "").toLowerCase();
      if (tool !== "bash" && tool !== "shell") return;
      const input = event.input;
      if (!input || typeof input !== "object" || typeof input.command !== "string") return;

      // ponytail: server process cwd; per-location graph detection needs
      // location-aware context if multi-project sessions ever matter
      if (!existsSync(join(process.cwd(), "graphify-out", "graph.json"))) return;

      input.command =
        'echo "[graphify] Knowledge graph available. Read graphify-out/GRAPH_REPORT.md for god nodes and architecture context before searching files." && ' +
        input.command;
      reminded = true;
    });
  },
});
