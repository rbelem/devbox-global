import { Plugin } from "@opencode-ai/plugin";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

// jev-measure — Phase 0 of the Jev token-reduction plan
// (~/.config/opencode/docs/research-jev-token-reduction.md). Measure-only: logs every
// completed tool output's size and shape to JSONL. Gates nothing, calls
// nothing, mutates nothing. Purposes: size the actual token leak, verify
// hook registration (silent no-op is the #1 risk), establish the
// hook-vs-truncation ordering, and record the real `result.content` shape
// per tool. Disable by deleting this file.

const LOG_PATH =
  process.env.JEV_MEASURE_LOG ??
  join(process.env.XDG_STATE_HOME ?? join(process.env.HOME ?? "", ".local", "state"), "opencode", "jev-measure.jsonl");

type Content = { text?: unknown };

function textLength(content: unknown): { chars: number; shape: string } {
  if (typeof content === "string") return { chars: content.length, shape: "string" };
  if (Array.isArray(content)) {
    let n = 0;
    for (const part of content as Content[]) {
      if (part && typeof part === "object" && typeof part.text === "string") n += part.text.length;
      else n += 8; // non-text part (image/file): nominal marker size
    }
    return { chars: n, shape: "array" };
  }
  if (content == null) return { chars: 0, shape: "absent" };
  return { chars: 0, shape: typeof content };
}

export default Plugin.define({
  id: "local.jev-measure",
  setup: async (ctx) => {
    try {
      mkdirSync(dirname(LOG_PATH), { recursive: true });
    } catch (e) {
      console.warn(`[jev-measure] cannot create log dir ${dirname(LOG_PATH)}: ${e} — plugin disabled`);
      return;
    }
    console.warn(`[jev-measure] active — logging tool output sizes to ${LOG_PATH}`);

    await ctx.tool.hook("execute.after", async (event) => {
      if (event.status !== "completed") return;
      try {
        const result = event.result ?? {};
        const content = (result as { content?: unknown }).content;
        const output = (result as { output?: unknown }).output;
        const measured = textLength(content);
        const row = {
          ts: new Date().toISOString(),
          tool: event.tool,
          sessionID: event.sessionID,
          agent: event.agent,
          chars: measured.chars,
          shape: measured.shape,
          has_output_field: output !== undefined,
          output_len: typeof output === "string" ? output.length : null,
          result_fields: Object.keys(result).sort().join(","),
        };
        appendFileSync(LOG_PATH, JSON.stringify(row) + "\n");
      } catch (e) {
        console.warn(`[jev-measure] log write failed: ${e}`);
      }
    });
  },
});
