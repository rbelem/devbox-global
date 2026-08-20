import { Plugin } from "@opencode-ai/plugin";
import { Service } from "@opencode-ai/client/service";
import { execFile } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// llm-verifier plugin: exposes a model-invoked `llm-verify` tool that scores
// the current session's trajectory with LLM-as-a-Verifier (llm_verifier). The
// model calls it at decision points — before a risky/irreversible action, or
// when unsure whether the task is actually solved.
//
// Thin delegating plugin (same pattern as rtk.ts / dcg-guard.ts): all logic
// lives in the sibling executable `llm-verifier/llm-verifier` (python CLI over
// the llm_verifier library; self-reexecs into the devbox python env, no
// shim).
//
// This file is the package entry (index.ts) of the llm-verifier plugin dir;
// the python CLI is its sibling `llm-verifier`. Both come from
// dotfiles/dot_config/opencode/plugins/llm-verifier/ (applied by chezmoi to
// ~/.config/opencode/plugins/llm-verifier/). An immediate plugin child dir
// with an index.ts is loaded as a plugin package automatically.
//
// Backend is env-driven: OPENAI_BASE_URL / DEEPSEEK_API_KEY / VERTEX_API_KEY.
// Must return token-level logprobs (vLLM, DeepSeek, Vertex Gemini).
//
// Disable by removing this directory from ~/.config/opencode/plugins/ or by
// uninstalling llm-verifier.

const MAX_STEPS = 30; // last N completed tool steps to score
const MAX_OUTPUT = 3000; // chars per tool result; keeps the verifier prompt bounded
const TIMEOUT = 300_000; // a progress sweep with repeats can take a while

type RunResult = { ok: boolean; code: number | null; stdout: string; stderr: string };

function run(cmd: string, args: string[], timeoutMs: number): Promise<RunResult> {
  return new Promise((resolve) => {
    try {
      execFile(cmd, args, { timeout: timeoutMs, encoding: "utf8", windowsHide: true }, (err, stdout, stderr) => {
        if (err && typeof (err as NodeJS.ErrnoException).code !== "number") {
          resolve({ ok: false, code: null, stdout: "", stderr: "" });
          return;
        }
        resolve({
          ok: true,
          code: err ? (err as NodeJS.ErrnoException & { code: number }).code : 0,
          stdout: String(stdout ?? ""),
          stderr: String(stderr ?? ""),
        });
      });
    } catch {
      resolve({ ok: false, code: null, stdout: "", stderr: "" });
    }
  });
}

// This file (index.ts) and the python CLI are siblings in the plugin package
// dir: <plugins>/llm-verifier/index.ts + <plugins>/llm-verifier/llm-verifier.
// Resolve the CLI relative to this module.
async function resolveCli(): Promise<string | null> {
  if (typeof import.meta === "undefined" || !import.meta.url) return null;
  const p = new URL("./llm-verifier", import.meta.url).pathname;
  const probe = await run("test", ["-x", p], 5000);
  return probe.ok && probe.code === 0 ? p : null;
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n)}\n…[truncated ${s.length - n} chars]`;
}

// Build trajectory steps from session messages: each completed tool call
// becomes one "action + observed output" step. Reasoning parts are excluded —
// the verifier is calibrated to distrust narration; only actions and output
// count as progress evidence.
function trajectorySteps(messages: unknown[]): string[] {
  const steps: string[] = [];
  for (const msg of messages) {
    const m = msg as { type?: string; content?: Array<Record<string, unknown>> };
    if (m.type !== "assistant") continue;
    for (const part of m.content ?? []) {
      if (part.type !== "tool") continue;
      const st = (part.state ?? {}) as Record<string, unknown>;
      if (st.status !== "completed") continue;
      const action = JSON.stringify(st.input ?? {});
      const output = (st.content ?? [])
        .filter((c): c is { type: string; text?: string } =>
          typeof c === "object" && c !== null && (c as { type?: string }).type === "text")
        .map((c) => c.text ?? "")
        .join("\n");
      steps.push(`tool ${String(part.name ?? "?")}\ninput: ${action}\noutput: ${truncate(output, MAX_OUTPUT)}`);
    }
  }
  return steps.slice(-MAX_STEPS);
}

// `ctx.session` does not expose messages (the plugin session surface is
// deliberately limited), so fetch them over the loopback API. `Service` from
// @opencode-ai/client discovers the running server and its auth, no
// hard-coded port or token.
let cachedEndpoint: { url: string } | null | undefined;
async function serverEndpoint(): Promise<{ url: string } | null> {
  if (cachedEndpoint === undefined) {
    cachedEndpoint = (await Service.discover()) ?? null;
  }
  return cachedEndpoint;
}

async function fetchSteps(id: string): Promise<{ id: string; steps: string[] }> {
  try {
    const ep = await serverEndpoint();
    if (!ep) return { id, steps: [] };
    const res = await fetch(`${ep.url.replace(/\/+$/, "")}/api/session/${id}/message`, {
      headers: Service.headers(ep as never),
    });
    if (!res.ok) return { id, steps: [] };
    const json = (await res.json()) as
      | unknown[]
      | { data?: unknown[]; messages?: unknown[] };
    const msgs = Array.isArray(json) ? json : json.data ?? json.messages ?? [];
    return { id, steps: trajectorySteps(msgs) };
  } catch {
    return { id, steps: [] };
  }
}

export default Plugin.define({
  id: "local.llm-verifier",
  setup: async (ctx) => {
    const cli = await resolveCli();
    if (!cli) {
      console.warn("[llm-verifier] CLI not found (sibling llm-verifier/llm-verifier " +
        "missing or not executable) — plugin disabled; make sure chezmoi applied " +
        "dotfiles/dot_config/opencode/plugins/llm-verifier/");
      return;
    }

    // NOTE: `tools.add` on this SDK takes a single plain-object definition
    // with an embedded `name` (the two-arg form `add(name, def)` crashes the
    // registration). See @opencode-ai/plugin/dist/promise/tool.d.ts.
    await ctx.tool.transform((tools) => {
      tools.add({
        name: "llm-verify",
        description:
          "Score an agent trajectory with LLM-as-a-Verifier (fine-grained, " +
          "logprob-based reward). Call it at decision points: before a risky " +
          "or irreversible action, or when unsure the task is actually solved. " +
          "Give the task as `problem`, optionally other session IDs in " +
          "`sessionIDs` to best-of-N select their trajectories (requires " +
          "`criteria`). Progress mode returns JSON { final, scores, steps } " +
          "where final≈1 means the task is solved to the verifier's knowledge " +
          "and final≈0 means rethink or ask the user. Verifier calls cost API " +
          "tokens; use sparingly.",
        input: {
          type: "object",
          properties: {
            problem: { type: "string", description: "The task instruction the session(s) work on." },
            criteria: { type: "string", description: "select mode only: benchmark criteria name, criteria .md path, or inline JSON {criterion: description}." },
            sessionIDs: { type: "array", items: { type: "string" }, description: "Optional other session IDs for best-of-N selection. Omit (or pass only the current session) for progress scoring." },
            evals: { type: "integer", default: 2, description: "Verifier repeats K; higher = less noisy, more cost." },
          },
          required: ["problem"],
          additionalProperties: false,
        },
        output: {
          type: "object",
          required: ["verdict"],
          properties: { verdict: { type: "string" } },
          additionalProperties: false,
        },
        execute: async (input, execCtx) => {
          const session = execCtx as { sessionID: string };
          const problem = String(input.problem ?? "");
          if (!problem) return err("problem is required");
          const evals = typeof input.evals === "number" && input.evals >= 1 ? Math.floor(input.evals) : 2;
          const ids = Array.isArray(input.sessionIDs) && input.sessionIDs.length
            ? [...new Set([...input.sessionIDs.map(String), session.sessionID])]
            : [session.sessionID];

          const per = await Promise.all(ids.map((id) => fetchSteps(id)));
          const candidates = per.filter((c) => c.steps.length > 0);
          if (candidates.length === 0) {
            return err("no completed tool steps found in the given session(s) — nothing to verify yet");
          }

          const dir = await mkdtemp(join(tmpdir(), "llm-verify-"));
          try {
            const writeSteps = async (name: string, steps: string[]) => {
              const f = join(dir, name);
              await writeFile(f, steps.map((s) => JSON.stringify(s)).join("\n") + "\n", "utf8");
              return f;
            };

            let args: string[];
            if (candidates.length === 1) {
              const tj = await writeSteps("trajectory.jsonl", candidates[0].steps);
              args = ["progress", "--problem", problem, "--trajectory", tj, "--evals", String(evals)];
            } else {
              if (!input.criteria) return err("select mode (multiple sessions) requires `criteria`");
              const files: string[] = [];
              for (const c of candidates) files.push(await writeSteps(`cand-${c.id.replace(/[^a-zA-Z0-9]/g, "")}.jsonl`, c.steps));
              args = ["select", "--problem", problem, "--candidates", files.join(","), "--criteria", String(input.criteria), "--evals", String(evals)];
            }

            const res = await run(cli, args, TIMEOUT);
            const body = res.stdout.trim() || res.stderr.trim() || `exit ${res.code ?? "?"}`;
            const verdict = { verdict: body };
            return { output: verdict, content: body };
          } finally {
            await rm(dir, { recursive: true, force: true });
          }
        },
      });
    });
  },
});

function err(message: string) {
  const verdict = { verdict: `error: ${message}` };
  return { output: verdict, content: verdict.verdict };
}
