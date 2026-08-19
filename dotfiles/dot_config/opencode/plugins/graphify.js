// graphify OpenCode plugin (V2 port)
// Injects a knowledge graph reminder before shell tool calls when the graph exists.
import { Plugin } from "@opencode-ai/plugin";
import { existsSync } from "fs";
import { join } from "path";

export default Plugin.define({
  id: "local.graphify",
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
