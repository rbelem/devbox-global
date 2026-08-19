// herdr agent-state plugin — LOCAL V2 PORT of herdr's managed integration.
// Upstream (herdr src/integration/assets/opencode, INTEGRATION_VERSION 9-10)
// still ships the V1 plugin API; this port bridges to V2 until herdr ships
// native opencode2 support. A `herdr plugin install/update` of the opencode
// integration will overwrite this file with V1 code — re-port or wait for
// upstream V2 then.
//
// Reports opencode lifecycle state (working/idle/blocked) and session ids to
// the herdr pane over the herdr socket API.
//
// ponytail: V2 loads global plugins in the shared background service, so
// HERDR_PANE_ID is inherited from whichever pane started the service. With
// multiple opencode2 panes on one service, state may attribute to the first
// pane. Acceptable (cosmetic) until herdr ships native V2 support.

import { Plugin } from "@opencode-ai/plugin";
import net from "node:net";

const SOURCE = "herdr:opencode";
const AGENT = "opencode";
let reportSeq = Date.now() * 1000;
let requestChain = Promise.resolve();
let reportedRootSessionID;

// Track child sessions so their events cannot replace the pane's root session.
// Their permission/form events still project state without attaching the
// child session id.
const childSessions = new Set();
const CHILD_EVENT_STATES = new Map([
  ["permission.asked", "blocked"],
  ["form.created", "blocked"],
  ["permission.replied", "working"],
  ["form.replied", "working"],
  ["form.cancelled", "working"],
]);

function nextReportSeq() {
  reportSeq += 1;
  return reportSeq;
}

function request(method, params) {
  const pending = requestChain.then(() => requestOnce(method, params));
  requestChain = pending.catch(() => {});
  return pending;
}

function requestOnce(method, params) {
  const paneId = process.env.HERDR_PANE_ID;
  const socketPath = process.env.HERDR_SOCKET_PATH;

  if (!paneId || !socketPath) {
    return Promise.resolve();
  }

  const socketEndpoint =
    process.platform === "win32" ? `\\\\.\\pipe\\${socketPath}` : socketPath;

  const requestId = `${SOURCE}:${Date.now()}:${Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0")}`;
  const request = {
    id: requestId,
    method,
    params: {
      pane_id: paneId,
      source: SOURCE,
      agent: AGENT,
      seq: nextReportSeq(),
      ...params,
    },
  };

  return new Promise((resolve) => {
    const client = net.createConnection(socketEndpoint, () => {
      client.write(`${JSON.stringify(request)}\n`);
    });

    const finish = () => {
      client.destroy();
      resolve();
    };

    client.setTimeout(500, finish);
    client.on("data", finish);
    client.on("error", finish);
    client.on("end", finish);
    client.on("close", resolve);
  });
}

function reportSession(sessionID, sessionStartSource) {
  if (!sessionID) {
    return Promise.resolve();
  }
  const params = { agent_session_id: sessionID };
  if (sessionStartSource) {
    params.session_start_source = sessionStartSource;
  }
  return request("pane.report_agent_session", params);
}

function reportState(state, sessionID) {
  const params = { state };
  if (sessionID) {
    reportedRootSessionID = sessionID;
    params.agent_session_id = sessionID;
  }
  return request("pane.report_agent", params);
}

export default Plugin.define({
  id: "local.herdr-agent-state",
  setup: async (ctx) => {
    if (
      process.env.HERDR_ENV !== "1" ||
      !process.env.HERDR_SOCKET_PATH ||
      !process.env.HERDR_PANE_ID
    ) {
      return;
    }

    const stream = await Promise.resolve(ctx.event.subscribe());
    void (async () => {
      try {
        for await (const ev of stream) {
          try {
            await handleEvent(ev);
          } catch {
            // never let reporting break the stream loop
          }
        }
      } catch {
        // stream closed (plugin unload / server shutdown)
      }
    })();
  },
});

async function handleEvent(ev) {
  const type = ev?.type;
  const data = ev?.data ?? {};
  const sessionID = typeof data.sessionID === "string" ? data.sessionID : undefined;

  // Track child sessions so they cannot replace the pane's root session.
  if (type === "session.created" && data.parentID) {
    childSessions.add(sessionID);
  }

  if (sessionID && childSessions.has(sessionID)) {
    const state = CHILD_EVENT_STATES.get(type);
    if (state) {
      await reportState(state);
    }
    return;
  }

  switch (type) {
    case "session.created":
      // A root session.created is a genuine new-session start (subagent
      // creates are dropped above). Signal it so herdr replaces the pane's
      // prior session id instead of treating the change as cross-talk.
      await reportSession(sessionID, "new");
      break;
    case "session.renamed":
      if (sessionID && sessionID !== reportedRootSessionID) {
        await reportSession(sessionID);
      }
      break;
    // Working: execution/step/tool/compaction activity, replies.
    case "session.execution.started":
    case "session.step.started":
    case "session.tool.called":
    case "session.compaction.ended":
    case "permission.replied":
    case "form.replied":
    case "form.cancelled":
      await reportState("working", sessionID);
      break;
    // Blocked: waiting on user or failed.
    case "permission.asked":
    case "form.created":
    case "session.execution.failed":
      await reportState("blocked", sessionID);
      break;
    case "session.idle":
      await reportState("idle", sessionID);
      break;
    default:
      break;
  }
}
