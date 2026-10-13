import { Plugin } from "@opencode-ai/plugin";

// V2 port of agentmemory-capture. Dropped V1-only surfaces with no V2
// equivalent: the `config` hook, `chat.params` temperature/topP capture,
// todo.updated / command.executed / session.diff / message.removed events,
// subtask-part tracking, and the experimental compaction transform.

const API = process.env.AGENTMEMORY_URL || "http://localhost:3111";
const FILE_TOOLS = new Set(["read", "write", "edit", "glob", "grep", "Read", "Write", "Edit", "Glob", "Grep"]);
const FILE_KEYS = ["filePath", "file_path", "path", "file", "pattern"];
const MAX_STASHED_FILES = 20;

const DEBUG = process.env.OPENCODE_AGENTMEMORY_DEBUG === "1";
const SECRET = process.env.AGENTMEMORY_SECRET || "";

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (SECRET) headers["Authorization"] = `Bearer ${SECRET}`;
  return headers;
}

async function post(path: string, body: Record<string, unknown>, timeoutMs = 5000): Promise<void> {
  try {
    await fetch(`${API}/agentmemory${path}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    if (DEBUG) console.error(`[agentmemory] POST ${path} failed:`, (e as Error).message);
  }
}

async function postJson(path: string, body: Record<string, unknown>): Promise<unknown | null> {
  try {
    const res = await fetch(`${API}/agentmemory${path}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok ? await res.json() : null;
  } catch (e) {
    if (DEBUG) console.error(`[agentmemory] POST ${path} failed:`, (e as Error).message);
    return null;
  }
}

let activeSessionId: string | null = null;
let projectPath: string | null = null;
const stashedFiles = new Map<string, Set<string>>();
const seenUserMessages = new Set<string>();
const contextInjectedSessions = new Set<string>();
const startContextCache = new Map<string, string>();

function stashFor(sid: string): Set<string> {
  let s = stashedFiles.get(sid);
  if (!s) { s = new Set<string>(); stashedFiles.set(sid, s); }
  return s;
}

function pruneSessionMaps(sid: string): void {
  stashedFiles.delete(sid);
  seenUserMessages.delete(sid);
  startContextCache.delete(sid);
  contextInjectedSessions.delete(sid);
}

function safeSlice(v: unknown, max: number): string {
  if (typeof v === "string") return v.slice(0, max);
  if (v == null) return "";
  try { return JSON.stringify(v).slice(0, max); } catch { return ""; }
}

function modelRefString(m: unknown): string | null {
  const ref = m as Record<string, unknown> | undefined | null;
  if (!ref || typeof ref !== "object") return null;
  const provider = ref.providerID ?? ref.provider;
  const id = ref.modelID ?? ref.id ?? ref.model;
  if (typeof provider !== "string" || typeof id !== "string") return null;
  return `${provider}/${id}`;
}

const AGENTMEMORY_INSTRUCTIONS = `<agentmemory-instructions>
You have access to agentmemory for persistent cross-session memory. Use these tools proactively.

CORE TOOLS:

memory_save — Save an insight, decision, or fact to long-term memory.
  Required: content (text), concepts (2-5 comma-separated keywords), type (pattern/preference/architecture/bug/workflow/fact)
  Optional: files (comma-separated paths)
  Use when: user says "remember this", after discovering a bug, after making an architectural decision, after learning a project convention.

memory_recall — Search past observations by keywords.
  Use when: user says "recall", "what did we do", "do you remember", or needs context from past sessions.

memory_smart_search — Hybrid semantic+keyword search with progressive disclosure.
  Use when: you need the most relevant past context, fuzzy/conceptual searches, or recall doesn't find what you need.

memory_sessions — List recent sessions with status and observation counts.
  Use when: user asks about session/past history, "what did we work on".

memory_file_history — Get past observations about specific files (across all sessions).
  Use when: you're about to edit a file and want to know its history, common pitfalls, or past edits.

memory_lesson_save — Save a lesson learned (what worked, what to avoid).
  Use when: you discover a pattern that could help future sessions avoid mistakes.

memory_lesson_recall — Search lessons by query. Returns lessons sorted by confidence.
  Use when: before making a decision, check if past lessons apply.

memory_governance_delete — Delete specific memories. Requires explicit user confirmation.
  Use when: user says "forget this", "delete that memory".

memory_patterns — Detect recurring patterns across sessions.
  Use when: you want to understand project-level trends over time.

memory_consolidate — Run the 4-tier memory consolidation pipeline.
  Use when: you want to compress and organize accumulated session observations.

All memory tools start with \`agentmemory_memory_\`. Use the exact names as they appear in your tool list. Tool results are JSON. Always check what was returned before presenting to the user.
</agentmemory-instructions>`;

function extractFilePaths(args: Record<string, unknown>): string[] {
  const files: string[] = [];
  for (const key of FILE_KEYS) {
    const val = args[key];
    if (typeof val === "string" && val.length > 0) {
      files.push(val);
    }
  }
  return files;
}

async function observe(
  sessionId: string,
  hookType: string,
  data: Record<string, unknown>,
): Promise<void> {
  await post("/observe", {
    hookType,
    sessionId,
    project: projectPath,
    cwd: projectPath,
    timestamp: new Date().toISOString(),
    data,
  });
}

export default Plugin.define({
  id: "local.agentmemory-capture",
  setup: async (ctx) => {
    projectPath = process.env.AGENTMEMORY_PROJECT || process.cwd();

    const handleEvent = async (ev: Record<string, any>): Promise<void> => {
      const type = ev?.type;
      const data = (ev?.data ?? {}) as Record<string, unknown>;

      if (type === "session.created") {
        const sid = (data.sessionID as string) || null;
        if (!sid) return;
        activeSessionId = sid;
        pruneSessionMaps(sid);
        const startResult = await postJson("/session/start", {
          sessionId: sid,
          title: data.title ?? null,
          parentID: data.parentID ?? null,
          version: data.version ?? null,
          project: projectPath,
          cwd: projectPath,
        });
        const startCtx = (startResult as any)?.context;
        if (typeof startCtx === "string" && startCtx.length > 0) {
          startContextCache.set(sid, startCtx);
        }
        return;
      }

      if (type === "session.idle") {
        const sid = (data.sessionID as string) || activeSessionId;
        if (!sid) return;
        await post("/summarize", { sessionId: sid });
        await observe(sid, "session_status", { status_type: "idle" });
        return;
      }

      if (type === "session.compaction.ended") {
        const sid = (data.sessionID as string) || activeSessionId;
        if (!sid) return;
        await post("/summarize", { sessionId: sid });
        await observe(sid, "session_compacted", { reason: data.reason ?? null });
        return;
      }

      if (type === "session.deleted") {
        const sid = (data.sessionID as string) || activeSessionId;
        if (!sid) return;
        await post("/session/end", { sessionId: sid });
        post("/crystals/auto", { olderThanDays: 7 }, 30000);
        post("/consolidate-pipeline", { tier: "all", force: true }, 30000);
        if (sid === activeSessionId) activeSessionId = null;
        pruneSessionMaps(sid);
        return;
      }

      if (type === "session.text.ended") {
        const sid = (data.sessionID as string) || activeSessionId;
        if (!sid) return;
        await observe(sid, "assistant_message", {
          messageID: data.assistantMessageID,
          text_length: typeof data.text === "string" ? data.text.length : null,
        });
        return;
      }

      if (type === "session.step.ended") {
        const sid = (data.sessionID as string) || activeSessionId;
        if (!sid) return;
        const tokens = (data.tokens as Record<string, unknown>) || {};
        await observe(sid, "step_finish", {
          messageID: data.assistantMessageID,
          reason: data.finish ?? null,
          cost: data.cost ?? 0,
          input_tokens: tokens.input ?? 0,
          output_tokens: tokens.output ?? 0,
          reasoning_tokens: tokens.reasoning ?? 0,
        });
        return;
      }

      if (type === "permission.asked") {
        const sid = (data.sessionID as string) || activeSessionId;
        if (!sid) return;
        await observe(sid, "notification", {
          notification_type: "permission_prompt",
          permission: data.action || "unknown",
          pattern: Array.isArray(data.resources) ? data.resources.join(", ") : "",
          tool_call_id: data.id || null,
        });
        return;
      }

      if (type === "permission.replied") {
        const sid = (data.sessionID as string) || activeSessionId;
        if (!sid) return;
        await observe(sid, "permission_replied", {
          permission_id: data.requestID || "",
          response: safeSlice(data.reply, 200),
        });
        return;
      }

      if (type === "filesystem.changed") {
        const sid = activeSessionId;
        if (!sid) return;
        const candidates = [data.file, data.path, ...(Array.isArray(data.files) ? data.files : [])];
        for (const c of candidates) {
          if (typeof c === "string" && c.length > 0) stashFor(sid).add(c);
        }
        return;
      }
    };

    try {
      const stream = await Promise.resolve(ctx.event.subscribe());
      void (async () => {
        try {
          for await (const ev of stream as AsyncIterable<Record<string, any>>) {
            try {
              await handleEvent(ev);
            } catch (e) {
              if (DEBUG) console.error("[agentmemory] event handler failed:", (e as Error).message);
            }
          }
        } catch {
          // stream closed (plugin unload / server shutdown)
        }
      })();
    } catch (e) {
      if (DEBUG) console.error("[agentmemory] event subscribe failed:", (e as Error).message);
    }

    await ctx.session.hook("context", async (event) => {
      const sid = event.sessionID;

      // prompt_submit: newest unseen user messages
      const messages = Array.isArray(event.messages) ? event.messages : [];
      for (const m of messages as Array<Record<string, any>>) {
        if (!m || m.role !== "user" || typeof m.id !== "string") continue;
        if (seenUserMessages.has(m.id)) continue;
        seenUserMessages.add(m.id);
        const parts = Array.isArray(m.parts) ? m.parts : [];
        const text = parts
          .filter((p: any) => p?.type === "text" && !p.synthetic && !p.ignored)
          .map((p: any) => p.text || "")
          .join("\n");
        const files = parts
          .filter((p: any) => p?.type === "file")
          .map((p: any) => p.filename || p.url)
          .filter(Boolean);
        if (text.trim().length === 0 && files.length === 0) continue;
        await observe(sid, "prompt_submit", {
          agent: event.agent ?? null,
          model: modelRefString(event.model),
          prompt: text.slice(0, 8000),
          files: files.slice(0, 20),
          parts_summary: parts.map((p: any) => p?.type).filter(Boolean),
        });
        const stash = stashFor(sid);
        for (const f of files) stash.add(f);
      }

      // system injection (V1 experimental.chat.system.transform)
      if (!contextInjectedSessions.has(sid) && Array.isArray(event.system)) {
        (event.system as Array<unknown>).push({ type: "text", text: AGENTMEMORY_INSTRUCTIONS });
        let memo = startContextCache.get(sid);
        if (typeof memo !== "string" || memo.length === 0) {
          const result = await postJson("/context", { sessionId: sid, project: projectPath });
          memo = (result as any)?.context;
        } else {
          startContextCache.delete(sid);
        }
        if (typeof memo === "string" && memo.length > 0) {
          (event.system as Array<unknown>).push({ type: "text", text: memo });
        }
        contextInjectedSessions.add(sid);
      }

      // file-history enrichment
      const stash = stashFor(sid);
      if (stash.size > 0) {
        const files = [...stash].slice(0, 10);
        const enrichResult = await postJson("/enrich", {
          sessionId: sid,
          files,
          toolName: "enrich_inject",
        });
        const enrichCtx = (enrichResult as any)?.context;
        if (typeof enrichCtx === "string" && enrichCtx.length > 0) {
          if (Array.isArray(event.system)) {
            (event.system as Array<unknown>).push({ type: "text", text: enrichCtx });
          }
          for (const f of files) stash.delete(f);
        }
      }
    });

    await ctx.session.hook("model.request", async (event) => {
      const sid = event.sessionID;
      if (!sid) return;
      await observe(sid, "llm_params", {
        model: modelRefString(event.model),
        provider_url: event.baseURL ?? null,
      });
    });

    await ctx.tool.hook("execute.before", (event) => {
      if (!FILE_TOOLS.has(String(event.tool))) return;
      const sid = event.sessionID || activeSessionId;
      if (!sid) return;
      const args = event.input as Record<string, unknown> | undefined;
      if (!args || typeof args !== "object") return;
      const stash = stashFor(sid);
      for (const fp of extractFilePaths(args)) {
        stash.add(fp);
      }
      if (stash.size > MAX_STASHED_FILES) {
        const keep = [...stash].slice(-MAX_STASHED_FILES);
        stash.clear();
        for (const f of keep) stash.add(f);
      }
    });

    await ctx.tool.hook("execute.after", async (event) => {
      const sid = event.sessionID || activeSessionId;
      if (!sid) return;
      const failed = event as { status: "error"; error: unknown };
      if (failed.status === "error") {
        await observe(sid, "post_tool_failure", {
          tool_name: event.tool,
          call_id: event.id,
          tool_input: safeSlice(event.input, 4000),
          tool_output: safeSlice(failed.error, 8000),
        });
      } else {
        const done = event as { status: "completed"; result: unknown };
        await observe(sid, "post_tool_use", {
          tool_name: event.tool,
          call_id: event.id,
          tool_input: safeSlice(event.input, 4000),
          tool_output: safeSlice(done.result, 8000),
        });
      }
    });
  },
});
