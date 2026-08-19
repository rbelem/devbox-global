import { createComponent as _$createComponent } from "@opentui/solid";
import { effect as _$effect } from "@opentui/solid";
import { createTextNode as _$createTextNode } from "@opentui/solid";
import { insertNode as _$insertNode } from "@opentui/solid";
import { insert as _$insert } from "@opentui/solid";
import { memo as _$memo } from "@opentui/solid";
import { setProp as _$setProp } from "@opentui/solid";
import { createElement as _$createElement } from "@opentui/solid";
/** @jsxImportSource @opentui/solid */

import { createEffect, createSignal, onCleanup, Show } from "solid-js";
import { formatDisplayedPercentLabel, formatResetCountdown } from "./lib/format-utils.js";
import { buildQuotaDialogCommandOutput, QUOTA_DIALOG_COMMANDS } from "./lib/quota-dialog-commands.js";
import { extractSingleWindowWindowLabel } from "./lib/quota-entry-display.js";
import { disposeQuotaTelemetryOwner } from "./lib/quota-telemetry.js";
import { getSidebarBodyLineColor } from "./lib/tui-line-style.js";
import { getCompactStatusText, getHomeBottomAnnouncementText, getSidebarPanelLines, getSidebarPanelLinesExpanded, shouldRenderCompactStatus, shouldRenderHomeBottom, shouldRenderSidebarPanel } from "./lib/tui-panel-state.js";
import { createTuiRefreshLifecycle } from "./lib/tui-refresh-lifecycle.js";
import { createTuiQuotaClient, getTuiRuntimeRootHints, getTuiSessionModelMeta, loadTuiHomeBottomStatus, loadTuiSessionQuotaSurfaces, normalizeTuiSessionID, resolveTuiSurfaceRegistration, writeTuiQuotaExportIfEnabled } from "./lib/tui-runtime.js";
const id = "@slkiser/opencode-quota";
// Place Quota near the top so variable-height built-in sections
// (MCP/LSP/Todo/Files) do not push it below the visible fold.
const SIDEBAR_ORDER = 150;
const COMPACT_ORDER = 90;
const REFRESH_INTERVAL_MS = 60_000;
const EVENT_REFRESH_DELAYS_MS = [150, 600];
const MOUNT_RECOVERY_DELAYS_MS = [500, 1_500, 4_000];
const FALLBACK_SURFACE_REGISTRATION = {
  commandDisplay: "inline",
  sidebar: {
    enabled: true
  },
  compact: {
    enabled: false,
    homeBottom: false,
    sessionPrompt: false,
    hasNativeProviderQuota: false,
    suppressedByNativeProviderQuota: false
  },
  promptBar: {
    enabled: false
  },
  announcements: {
    homeBottom: false
  },
  homeBottom: false
};
function createTuiInitialLoadCoordinator(seed) {
  let sessionAvailable = true;
  let homeAvailable = true;
  return {
    takeInitialSession() {
      if (!sessionAvailable) return undefined;
      sessionAvailable = false;
      return seed;
    },
    takeInitialHome() {
      if (!homeAvailable) return undefined;
      homeAvailable = false;
      return seed;
    }
  };
}
function createTuiRegistrationGate() {
  const [current, setCurrent] = createSignal({
    status: "pending"
  });
  return {
    current,
    activate(registration, initialLoads) {
      if (current().status !== "pending") return;
      setCurrent({
        status: "active",
        registration,
        initialLoads
      });
    },
    dispose() {
      if (current().status === "disposed") return;
      setCurrent({
        status: "disposed"
      });
    }
  };
}
const sessionResources = new WeakMap();
const homeResources = new WeakMap();
function getSessionResourceMap(api) {
  const existing = sessionResources.get(api);
  if (existing) return existing;
  const next = new Map();
  sessionResources.set(api, next);
  return next;
}
function createSessionQuotaResource(api, sessionID, initialLoads) {
  const [sidebar, setSidebar] = createSignal({
    status: "loading",
    lines: []
  });
  const [compact, setCompact] = createSignal({
    status: "loading"
  });
  const [promptBar, setPromptBar] = createSignal({
    status: "loading"
  });
  let loadOrdinal = 0;
  const lifecycle = createTuiRefreshLifecycle({
    load: () => {
      const initialRuntimeSeed = loadOrdinal === 0 ? initialLoads?.takeInitialSession() : undefined;
      loadOrdinal += 1;
      return loadTuiSessionQuotaSurfaces({
        api,
        sessionID,
        ...(initialRuntimeSeed ? {
          initialRuntimeSeed
        } : {})
      });
    },
    apply: next => {
      setSidebar(next.sidebar);
      setCompact(next.compact);
      setPromptBar(next.promptBar ?? {
        status: "loading"
      });
    },
    intervalMs: REFRESH_INTERVAL_MS,
    eventRefreshDelaysMs: EVENT_REFRESH_DELAYS_MS,
    // TUI/session state can hydrate asynchronously after mount or session switch,
    // so retry a few times to recover from empty first-load reads.
    recoveryDelaysMs: MOUNT_RECOVERY_DELAYS_MS,
    subscribe: scheduleRefresh => [api.event.on("session.updated", event => {
      if (event.properties?.info?.id === sessionID) {
        scheduleRefresh();
      }
    }), api.event.on("message.updated", event => {
      if (event.properties?.info?.sessionID === sessionID) {
        scheduleRefresh();
      }
    }), api.event.on("message.removed", event => {
      if (event.properties?.sessionID === sessionID) {
        scheduleRefresh();
      }
    }), api.event.on("tui.session.select", event => {
      if (event.properties?.sessionID === sessionID) {
        scheduleRefresh();
      }
    })],
    onDispose: () => {
      getSessionResourceMap(api).delete(sessionID);
    }
  });
  const resource = {
    sessionID,
    sidebar,
    compact,
    promptBar,
    retain: () => {
      lifecycle.retain();
      return resource;
    },
    release: lifecycle.release
  };
  return resource;
}
function acquireSessionQuotaResource(api, sessionID, initialLoads) {
  const resources = getSessionResourceMap(api);
  const existing = resources.get(sessionID);
  if (existing) return existing.retain();
  const next = createSessionQuotaResource(api, sessionID, initialLoads).retain();
  resources.set(sessionID, next);
  return next;
}
function createHomeBottomResource(api, compactHomeBottomEnabled, initialLoads) {
  const [bottom, setBottom] = createSignal({
    status: "loading",
    compact: compactHomeBottomEnabled ? {
      status: "loading"
    } : {
      status: "disabled"
    }
  });
  let loadOrdinal = 0;
  const lifecycle = createTuiRefreshLifecycle({
    load: () => {
      const initialRuntimeSeed = loadOrdinal === 0 ? initialLoads?.takeInitialHome() : undefined;
      loadOrdinal += 1;
      return loadTuiHomeBottomStatus({
        api,
        ...(initialRuntimeSeed ? {
          initialRuntimeSeed
        } : {})
      });
    },
    apply: setBottom,
    afterApply: () => {
      // Fire-and-forget: write export file if enabled. A failed write must
      // never affect TUI rendering, so log a warning and continue.
      void writeTuiQuotaExportIfEnabled({
        api
      }).catch(err => {
        console.warn(`[opencode-quota] quota export write failed: ${String(err)}`);
      });
    },
    intervalMs: REFRESH_INTERVAL_MS,
    eventRefreshDelaysMs: EVENT_REFRESH_DELAYS_MS,
    subscribe: scheduleRefresh => [api.event.on("session.updated", scheduleRefresh), api.event.on("message.updated", scheduleRefresh), api.event.on("message.removed", scheduleRefresh), api.event.on("tui.session.select", scheduleRefresh)],
    onDispose: () => {
      homeResources.delete(api);
    }
  });
  const resource = {
    bottom,
    retain: () => {
      lifecycle.retain();
      return resource;
    },
    release: lifecycle.release
  };
  return resource;
}
function acquireHomeBottomResource(api, compactHomeBottomEnabled, initialLoads) {
  const existing = homeResources.get(api);
  if (existing) return existing.retain();
  const next = createHomeBottomResource(api, compactHomeBottomEnabled, initialLoads).retain();
  homeResources.set(api, next);
  return next;
}
function useSessionQuotaResource(api, sessionID, initialLoads) {
  let current = acquireSessionQuotaResource(api, sessionID(), initialLoads);
  const [resource, setResource] = createSignal(current);
  createEffect(() => {
    const nextSessionID = sessionID();
    if (current.sessionID === nextSessionID) return;
    const previous = current;
    current = acquireSessionQuotaResource(api, nextSessionID, initialLoads);
    setResource(current);
    previous.release();
  });
  onCleanup(() => {
    current.release();
  });
  return resource;
}
function SidebarContentView(props) {
  const resource = useSessionQuotaResource(props.api, () => props.sessionID, props.initialLoads);
  const panel = () => resource().sidebar();
  const lines = () => getSidebarPanelLines(panel());
  const hasDetailLines = () => Boolean(panel().linesExpanded?.length);
  const [collapsed, setCollapsed] = createSignal(props.api.kv?.get("quota-sidebar-collapsed", true) ?? true);
  const toggleCollapsed = () => {
    if (!hasDetailLines()) return;
    const next = !collapsed();
    setCollapsed(next);
    props.api.kv?.set("quota-sidebar-collapsed", next);
  };
  const displayLines = () => {
    if (!hasDetailLines()) return lines();
    return collapsed() ? lines() : getSidebarPanelLinesExpanded(panel());
  };
  const toggleIcon = () => collapsed() ? "▶" : "▼";
  const providerCount = () => panel().providerCount ?? 0;
  return _$createComponent(Show, {
    get when() {
      return shouldRenderSidebarPanel(panel());
    },
    get children() {
      var _el$ = _$createElement("box"),
        _el$2 = _$createElement("box"),
        _el$3 = _$createElement("text"),
        _el$4 = _$createElement("b"),
        _el$8 = _$createElement("box");
      _$insertNode(_el$, _el$2);
      _$insertNode(_el$, _el$8);
      _$setProp(_el$, "gap", 0);
      _$insertNode(_el$2, _el$3);
      _$setProp(_el$2, "flexDirection", "row");
      _$insertNode(_el$3, _el$4);
      _$setProp(_el$3, "onMouseDown", toggleCollapsed);
      _$insert(_el$4, (() => {
        var _c$ = _$memo(() => !!hasDetailLines());
        return () => _c$() ? `${toggleIcon()} Quota` : "Quota";
      })());
      _$insert(_el$2, _$createComponent(Show, {
        get when() {
          return _$memo(() => !!collapsed())() && providerCount() > 0;
        },
        get children() {
          var _el$5 = _$createElement("text"),
            _el$6 = _$createTextNode(` (`),
            _el$7 = _$createTextNode(` providers)`);
          _$insertNode(_el$5, _el$6);
          _$insertNode(_el$5, _el$7);
          _$insert(_el$5, providerCount, _el$7);
          _$effect(_$p => _$setProp(_el$5, "fg", props.api.theme.current.textMuted, _$p));
          return _el$5;
        }
      }), null);
      _$setProp(_el$8, "gap", 0);
      _$insert(_el$8, () => displayLines().map(line => (() => {
        var _el$9 = _$createElement("text");
        _$setProp(_el$9, "wrapMode", "none");
        _$insert(_el$9, line || " ");
        _$effect(_$p => _$setProp(_el$9, "fg", getSidebarBodyLineColor(line, props.api.theme.current), _$p));
        return _el$9;
      })()));
      _$effect(_$p => _$setProp(_el$3, "fg", props.api.theme.current.text, _$p));
      return _el$;
    }
  });
}
function CompactStatusLine(props) {
  const text = () => {
    const panel = props.panel();
    if (!shouldRenderCompactStatus(panel)) return "";
    return getCompactStatusText(panel);
  };
  const line = () => (() => {
    var _el$0 = _$createElement("box"),
      _el$1 = _$createElement("text");
    _$insertNode(_el$0, _el$1);
    _$setProp(_el$0, "flexDirection", "row");
    _$setProp(_el$1, "wrapMode", "none");
    _$insert(_el$1, text);
    _$effect(_p$ => {
      var _v$ = props.justifyContent,
        _v$2 = props.api.theme.current.textMuted;
      _v$ !== _p$.e && (_p$.e = _$setProp(_el$0, "justifyContent", _v$, _p$.e));
      _v$2 !== _p$.t && (_p$.t = _$setProp(_el$1, "fg", _v$2, _p$.t));
      return _p$;
    }, {
      e: undefined,
      t: undefined
    });
    return _el$0;
  })();
  return _$createComponent(Show, {
    get when() {
      return text();
    },
    get children() {
      return _$createComponent(Show, {
        get when() {
          return props.blankLineBefore;
        },
        get fallback() {
          return line();
        },
        get children() {
          var _el$10 = _$createElement("box"),
            _el$11 = _$createElement("text");
          _$insertNode(_el$10, _el$11);
          _$setProp(_el$10, "gap", 0);
          _$insertNode(_el$11, _$createTextNode(` `));
          _$insert(_el$10, line, null);
          return _el$10;
        }
      });
    }
  });
}
function SessionPromptWithCompactStatus(props) {
  const resource = useSessionQuotaResource(props.api, () => props.sessionID, props.initialLoads);
  const panel = () => resource().compact();
  return (() => {
    var _el$13 = _$createElement("box");
    _$setProp(_el$13, "gap", 0);
    _$insert(_el$13, _$createComponent(props.api.ui.Prompt, {
      get sessionID() {
        return props.sessionID;
      },
      get visible() {
        return props.visible;
      },
      get disabled() {
        return props.disabled;
      },
      get onSubmit() {
        return props.onSubmit;
      },
      ref(r$) {
        var _ref$ = props.promptRef;
        typeof _ref$ === "function" ? _ref$(r$) : props.promptRef = r$;
      }
    }), null);
    _$insert(_el$13, _$createComponent(CompactStatusLine, {
      get api() {
        return props.api;
      },
      panel: panel,
      justifyContent: "flex-end"
    }), null);
    return _el$13;
  })();
}
const PROMPT_BAR_WIDTH = 12;
function shouldRenderPromptBar(bar) {
  return bar.status === "ready" && Boolean(bar.entry);
}
function useSessionRunning(api, sessionID) {
  const [running, setRunning] = createSignal(false);
  createEffect(() => {
    const id = sessionID();
    if (!id) {
      setRunning(false);
      return;
    }
    const update = () => {
      try {
        const sessionState = api.state.session;
        const status = sessionState.status?.(id);
        setRunning(status?.type === "busy" || status?.type === "retry");
      } catch {
        setRunning(false);
      }
    };
    update();
    const disposers = [api.event.on("session.status", event => {
      if (event.properties?.sessionID === id) {
        update();
      }
    }), api.event.on("session.updated", event => {
      if (event.properties?.info?.id === id) {
        update();
      }
    })];
    onCleanup(() => {
      for (const dispose of disposers) {
        if (typeof dispose === "function") {
          dispose();
        }
      }
    });
  });
  return running;
}
function buildPromptBarParts(params) {
  const bar = params.bar();
  if (!shouldRenderPromptBar(bar)) return undefined;
  const entry = bar.entry;
  if (!entry) return undefined;
  const windowLabel = extractSingleWindowWindowLabel(entry.label ?? "") ?? extractSingleWindowWindowLabel(entry.name ?? "") ?? "Quota";
  const percent = formatDisplayedPercentLabel(entry.percentRemaining ?? 0, bar.percentDisplayMode ?? "remaining");
  const reset = entry.resetTimeIso ? formatResetCountdown(entry.resetTimeIso, {
    compactRounded: true,
    decimals: bar.resetTimeDecimals
  }) : "";
  const p = Math.max(0, Math.min(100, Math.round(entry.percentRemaining ?? 0)));
  const filled = Math.round(p / 100 * PROMPT_BAR_WIDTH);
  const empty = PROMPT_BAR_WIDTH - filled;
  let barText = "█".repeat(filled) + "░".repeat(empty);
  if (params.running() && filled > 0) {
    const cells = Array(filled).fill("▓");
    const center = params.phase() % filled;
    const gradient = ["▒", "▓", "█", "▓", "▒"];
    for (let offset = -2; offset <= 2; offset++) {
      const position = (center + offset + filled) % filled;
      cells[position] = gradient[offset + 2];
    }
    barText = cells.join("") + "░".repeat(empty);
  }
  return {
    label: windowLabel,
    barText,
    meta: [percent.replace(/\s+left$/u, ""), reset].filter(Boolean).join(" | ")
  };
}
function PromptQuotaHint(props) {
  const parts = () => buildPromptBarParts(props);
  const barColor = () => props.api.theme.current.textMuted;
  const label = () => parts()?.label ?? "";
  const bar = () => parts()?.barText ?? "";
  const meta = () => parts()?.meta ?? "";
  return _$createComponent(Show, {
    get when() {
      return parts();
    },
    get children() {
      var _el$14 = _$createElement("box"),
        _el$15 = _$createElement("text"),
        _el$16 = _$createElement("text"),
        _el$17 = _$createElement("text");
      _$insertNode(_el$14, _el$15);
      _$insertNode(_el$14, _el$16);
      _$insertNode(_el$14, _el$17);
      _$setProp(_el$14, "flexDirection", "row");
      _$setProp(_el$14, "justifyContent", "flex-end");
      _$setProp(_el$14, "gap", 1);
      _$setProp(_el$15, "wrapMode", "none");
      _$insert(_el$15, label);
      _$setProp(_el$16, "wrapMode", "none");
      _$insert(_el$16, bar);
      _$setProp(_el$17, "wrapMode", "none");
      _$insert(_el$17, meta);
      _$effect(_p$ => {
        var _v$3 = props.api.theme.current.textMuted,
          _v$4 = barColor(),
          _v$5 = props.api.theme.current.textMuted;
        _v$3 !== _p$.e && (_p$.e = _$setProp(_el$15, "fg", _v$3, _p$.e));
        _v$4 !== _p$.t && (_p$.t = _$setProp(_el$16, "fg", _v$4, _p$.t));
        _v$5 !== _p$.a && (_p$.a = _$setProp(_el$17, "fg", _v$5, _p$.a));
        return _p$;
      }, {
        e: undefined,
        t: undefined,
        a: undefined
      });
      return _el$14;
    }
  });
}
function SessionQuotaPromptBar(props) {
  const resource = useSessionQuotaResource(props.api, () => props.sessionID, props.initialLoads);
  const promptBar = () => resource().promptBar();
  const running = useSessionRunning(props.api, () => props.sessionID);
  const [phase, setPhase] = createSignal(0);
  createEffect(() => {
    if (!running() || !shouldRenderPromptBar(promptBar())) {
      setPhase(0);
      return;
    }
    const interval = setInterval(() => setPhase(p => p + 1), 160);
    onCleanup(() => clearInterval(interval));
  });
  return (() => {
    var _el$18 = _$createElement("box");
    _$setProp(_el$18, "gap", 0);
    _$insert(_el$18, _$createComponent(props.api.ui.Prompt, {
      get sessionID() {
        return props.sessionID;
      },
      get visible() {
        return props.visible;
      },
      get disabled() {
        return props.disabled;
      },
      get onSubmit() {
        return props.onSubmit;
      },
      ref(r$) {
        var _ref$2 = props.promptRef;
        typeof _ref$2 === "function" ? _ref$2(r$) : props.promptRef = r$;
      }
    }), null);
    _$insert(_el$18, _$createComponent(PromptQuotaHint, {
      get api() {
        return props.api;
      },
      bar: promptBar,
      running: running,
      phase: phase
    }), null);
    return _el$18;
  })();
}
function HomeBottomView(props) {
  const resource = acquireHomeBottomResource(props.api, props.compactHomeBottomEnabled, props.initialLoads);
  onCleanup(() => resource.release());
  const announcement = () => getHomeBottomAnnouncementText(resource.bottom());
  const compact = () => resource.bottom().compact;
  const visible = () => shouldRenderHomeBottom(resource.bottom());
  return (() => {
    var _el$19 = _$createElement("box");
    _$setProp(_el$19, "gap", 0);
    _$insert(_el$19, _$createComponent(Show, {
      get when() {
        return visible();
      },
      get children() {
        var _el$20 = _$createElement("text");
        _$insertNode(_el$20, _$createTextNode(` `));
        return _el$20;
      }
    }), null);
    _$insert(_el$19, _$createComponent(Show, {
      get when() {
        return _$memo(() => !!visible())() && announcement();
      },
      get children() {
        var _el$22 = _$createElement("box"),
          _el$23 = _$createElement("text");
        _$insertNode(_el$22, _el$23);
        _$setProp(_el$22, "flexDirection", "row");
        _$setProp(_el$22, "justifyContent", "center");
        _$setProp(_el$23, "wrapMode", "none");
        _$insert(_el$23, announcement);
        _$effect(_$p => _$setProp(_el$23, "fg", props.api.theme.current.textMuted, _$p));
        return _el$22;
      }
    }), null);
    _$insert(_el$19, _$createComponent(Show, {
      get when() {
        return visible();
      },
      get children() {
        return _$createComponent(CompactStatusLine, {
          get api() {
            return props.api;
          },
          panel: compact,
          justifyContent: "center"
        });
      }
    }), null);
    return _el$19;
  })();
}
function getActiveTuiSessionID(api) {
  if (api.route.current.name !== "session") return undefined;
  return normalizeTuiSessionID(api.route.current.params?.sessionID);
}
function getTuiCommandArguments(input) {
  if (!input || typeof input !== "object") return undefined;
  const record = input;
  for (const key of ["arguments", "args", "query"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}
function CommandLoadingDialog(props) {
  return (() => {
    var _el$24 = _$createElement("box"),
      _el$25 = _$createElement("text"),
      _el$26 = _$createElement("b"),
      _el$27 = _$createElement("text");
    _$insertNode(_el$24, _el$25);
    _$insertNode(_el$24, _el$27);
    _$setProp(_el$24, "gap", 1);
    _$setProp(_el$24, "paddingLeft", 2);
    _$setProp(_el$24, "paddingRight", 2);
    _$setProp(_el$24, "paddingBottom", 1);
    _$insertNode(_el$25, _el$26);
    _$insert(_el$26, () => props.title);
    _$insertNode(_el$27, _$createTextNode(`Loading deterministic local output…`));
    _$effect(_p$ => {
      var _v$6 = props.api.theme.current.text,
        _v$7 = props.api.theme.current.textMuted;
      _v$6 !== _p$.e && (_p$.e = _$setProp(_el$25, "fg", _v$6, _p$.e));
      _v$7 !== _p$.t && (_p$.t = _$setProp(_el$27, "fg", _v$7, _p$.t));
      return _p$;
    }, {
      e: undefined,
      t: undefined
    });
    return _el$24;
  })();
}
function CommandOutputDialog(props) {
  const lines = () => props.output.split("\n");
  const bodyHeight = () => Math.min(28, Math.max(6, lines().length));
  return (() => {
    var _el$29 = _$createElement("box"),
      _el$30 = _$createElement("text"),
      _el$31 = _$createElement("b"),
      _el$32 = _$createElement("scrollbox"),
      _el$33 = _$createElement("box"),
      _el$34 = _$createElement("text");
    _$insertNode(_el$29, _el$30);
    _$insertNode(_el$29, _el$32);
    _$insertNode(_el$29, _el$34);
    _$setProp(_el$29, "gap", 1);
    _$setProp(_el$29, "width", "100%");
    _$setProp(_el$29, "flexGrow", 1);
    _$setProp(_el$29, "paddingLeft", 2);
    _$setProp(_el$29, "paddingRight", 2);
    _$setProp(_el$29, "paddingBottom", 1);
    _$insertNode(_el$30, _el$31);
    _$insert(_el$31, () => props.title);
    _$insertNode(_el$32, _el$33);
    _$setProp(_el$32, "width", "100%");
    _$setProp(_el$32, "flexGrow", 1);
    _$setProp(_el$32, "maxHeight", 28);
    _$setProp(_el$33, "gap", 0);
    _$setProp(_el$33, "width", "100%");
    _$setProp(_el$33, "minWidth", 0);
    _$insert(_el$33, () => lines().map(line => (() => {
      var _el$36 = _$createElement("text");
      _$setProp(_el$36, "wrapMode", "word");
      _$setProp(_el$36, "width", "100%");
      _$insert(_el$36, line || " ");
      _$effect(_$p => _$setProp(_el$36, "fg", props.api.theme.current.text, _$p));
      return _el$36;
    })()));
    _$insertNode(_el$34, _$createTextNode(`esc closes`));
    _$effect(_p$ => {
      var _v$8 = props.api.theme.current.text,
        _v$9 = bodyHeight(),
        _v$0 = props.api.theme.current.textMuted;
      _v$8 !== _p$.e && (_p$.e = _$setProp(_el$30, "fg", _v$8, _p$.e));
      _v$9 !== _p$.t && (_p$.t = _$setProp(_el$32, "minHeight", _v$9, _p$.t));
      _v$0 !== _p$.a && (_p$.a = _$setProp(_el$34, "fg", _v$0, _p$.a));
      return _p$;
    }, {
      e: undefined,
      t: undefined,
      a: undefined
    });
    return _el$29;
  })();
}
function CommandErrorDialog(props) {
  const message = props.error instanceof Error ? props.error.message : String(props.error);
  return (() => {
    var _el$37 = _$createElement("box"),
      _el$38 = _$createElement("text"),
      _el$39 = _$createElement("b"),
      _el$40 = _$createElement("text"),
      _el$42 = _$createElement("text"),
      _el$43 = _$createElement("text");
    _$insertNode(_el$37, _el$38);
    _$insertNode(_el$37, _el$40);
    _$insertNode(_el$37, _el$42);
    _$insertNode(_el$37, _el$43);
    _$setProp(_el$37, "gap", 1);
    _$setProp(_el$37, "paddingLeft", 2);
    _$setProp(_el$37, "paddingRight", 2);
    _$setProp(_el$37, "paddingBottom", 1);
    _$insertNode(_el$38, _el$39);
    _$insert(_el$39, () => props.title);
    _$insertNode(_el$40, _$createTextNode(`OpenCode Quota command failed.`));
    _$setProp(_el$42, "wrapMode", "none");
    _$insert(_el$42, message || "Unknown error");
    _$insertNode(_el$43, _$createTextNode(`esc closes`));
    _$effect(_p$ => {
      var _v$1 = props.api.theme.current.text,
        _v$10 = props.api.theme.current.text,
        _v$11 = props.api.theme.current.textMuted,
        _v$12 = props.api.theme.current.textMuted;
      _v$1 !== _p$.e && (_p$.e = _$setProp(_el$38, "fg", _v$1, _p$.e));
      _v$10 !== _p$.t && (_p$.t = _$setProp(_el$40, "fg", _v$10, _p$.t));
      _v$11 !== _p$.a && (_p$.a = _$setProp(_el$42, "fg", _v$11, _p$.a));
      _v$12 !== _p$.o && (_p$.o = _$setProp(_el$43, "fg", _v$12, _p$.o));
      return _p$;
    }, {
      e: undefined,
      t: undefined,
      a: undefined,
      o: undefined
    });
    return _el$37;
  })();
}
function getCommandPromptCopy(spec) {
  switch (spec.id) {
    case "tokens_between":
      return {
        title: "OpenCode Quota Token Range",
        placeholder: "YYYY-MM-DD YYYY-MM-DD",
        description: "Enter start and end dates, for example: 2026-01-01 2026-01-15"
      };
    case "quota_status":
      return {
        title: "OpenCode Quota Status Options",
        placeholder: 'Optional JSON, e.g. {"refreshGoogleTokens":true}',
        description: "Leave blank for normal diagnostics, or enter one JSON options object."
      };
    default:
      return {
        title: spec.title,
        placeholder: "Optional arguments",
        description: "Leave blank to run with no arguments."
      };
  }
}
function replaceDialog(api, size, render) {
  api.ui.dialog.replace(render);
  // OpenCode dialog.replace() resets size to medium.
  api.ui.dialog.setSize(size);
}
async function runQuotaDialogCommandAsync(api, command, commandDisplay, rawInput, state) {
  const spec = QUOTA_DIALOG_COMMANDS.find(item => item.id === command);
  const argumentsText = getTuiCommandArguments(rawInput);
  const sessionID = getActiveTuiSessionID(api);
  if (spec.acceptsArguments && rawInput === undefined) {
    const prompt = getCommandPromptCopy(spec);
    replaceDialog(api, "medium", () => _$createComponent(api.ui.DialogPrompt, {
      get title() {
        return prompt.title;
      },
      get placeholder() {
        return prompt.placeholder;
      },
      description: () => (() => {
        var _el$45 = _$createElement("text");
        _$setProp(_el$45, "wrapMode", "word");
        _$insert(_el$45, () => prompt.description);
        _$effect(_$p => _$setProp(_el$45, "fg", api.theme.current.textMuted, _$p));
        return _el$45;
      })(),
      onCancel: () => api.ui.dialog.clear(),
      onConfirm: value => {
        void runQuotaDialogCommandAsync(api, command, commandDisplay, {
          arguments: value.trim()
        }, state);
      }
    }));
    return;
  }
  const destination = commandDisplay === "inline" && sessionID ? {
    type: "inline",
    sessionID
  } : {
    type: "dialog"
  };
  if (destination.type === "dialog") {
    replaceDialog(api, spec.dialogSize, () => _$createComponent(CommandLoadingDialog, {
      api: api,
      get title() {
        return spec.title;
      }
    }));
  }
  try {
    const result = await buildQuotaDialogCommandOutput({
      command,
      arguments: argumentsText,
      client: createTuiQuotaClient(api),
      roots: getTuiRuntimeRootHints(api),
      sessionID,
      resolveSessionMeta: id => getTuiSessionModelMeta(api, id),
      lastSessionTokenError: state?.lastSessionTokenError,
      setLastSessionTokenError: state ? error => {
        state.lastSessionTokenError = error;
      } : undefined,
      log: async (message, extra) => {
        await api.client.app.log({
          body: {
            service: "quota-toast",
            level: "debug",
            message,
            extra
          }
        });
      }
    });
    if (result.state === "noop") {
      if (destination.type === "dialog") api.ui.dialog.clear();
      return;
    }
    if (destination.type === "inline") {
      await api.client.session.prompt({
        sessionID: destination.sessionID,
        noReply: true,
        parts: [{
          type: "text",
          text: result.output,
          ignored: true
        }]
      });
      return;
    }
    replaceDialog(api, result.dialogSize, () => _$createComponent(CommandOutputDialog, {
      api: api,
      get title() {
        return result.title;
      },
      get output() {
        return result.output;
      }
    }));
  } catch (error) {
    replaceDialog(api, "large", () => _$createComponent(CommandErrorDialog, {
      api: api,
      get title() {
        return spec.title;
      },
      error: error
    }));
    api.ui.toast({
      variant: "error",
      message: "OpenCode Quota command failed"
    });
  }
}
function registerQuotaDialogCommands(api, gate) {
  const commandState = {};
  const dispose = api.keymap.registerLayer({
    commands: QUOTA_DIALOG_COMMANDS.map(spec => ({
      namespace: "palette",
      name: `opencode-quota.${spec.id}`,
      title: spec.title,
      desc: spec.description,
      category: "OpenCode Quota",
      slashName: spec.slashName,
      run(input) {
        const state = gate.current();
        if (state.status !== "active") return;
        void runQuotaDialogCommandAsync(api, spec.id, state.registration.commandDisplay, input, commandState);
      }
    })),
    bindings: []
  });
  api.lifecycle.onDispose(dispose);
}
function registerStableTuiSlots(api, current) {
  api.slots.register({
    order: SIDEBAR_ORDER,
    slots: {
      sidebar_content(_ctx, props) {
        const state = current();
        if (state.status !== "active" || !state.registration.sidebar.enabled) return null;
        return _$createComponent(SidebarContentView, {
          api: api,
          get sessionID() {
            return props.session_id;
          },
          get initialLoads() {
            return state.initialLoads;
          }
        });
      }
    }
  });
  api.slots.register({
    order: COMPACT_ORDER,
    slots: {
      session_prompt(_ctx, props) {
        const state = current();
        if (state.status !== "active") return null;
        if (state.registration.promptBar.enabled) {
          return _$createComponent(SessionQuotaPromptBar, {
            api: api,
            get sessionID() {
              return props.session_id;
            },
            get initialLoads() {
              return state.initialLoads;
            },
            get visible() {
              return props.visible;
            },
            get disabled() {
              return props.disabled;
            },
            get onSubmit() {
              return props.on_submit;
            },
            get promptRef() {
              return props.ref;
            }
          });
        }
        if (!state.registration.compact.sessionPrompt) return null;
        return _$createComponent(SessionPromptWithCompactStatus, {
          api: api,
          get sessionID() {
            return props.session_id;
          },
          get initialLoads() {
            return state.initialLoads;
          },
          get visible() {
            return props.visible;
          },
          get disabled() {
            return props.disabled;
          },
          get onSubmit() {
            return props.on_submit;
          },
          get promptRef() {
            return props.ref;
          }
        });
      },
      home_bottom() {
        const state = current();
        if (state.status !== "active" || !state.registration.homeBottom) return null;
        return _$createComponent(HomeBottomView, {
          api: api,
          get compactHomeBottomEnabled() {
            return state.registration.compact.homeBottom;
          },
          get initialLoads() {
            return state.initialLoads;
          }
        });
      }
    }
  });
}
async function initializeTuiRegistration(api, gate) {
  let initialRuntimeSeed;
  let surfaceRegistration;
  try {
    surfaceRegistration = resolveTuiSurfaceRegistration(api, {
      captureInitialRuntime(seed) {
        initialRuntimeSeed = seed;
      }
    }).then(registration => ({
      registration,
      initialRuntimeSeed
    })).catch(() => ({
      registration: FALLBACK_SURFACE_REGISTRATION
    }));
  } catch {
    surfaceRegistration = Promise.resolve({
      registration: FALLBACK_SURFACE_REGISTRATION
    });
  }
  registerQuotaDialogCommands(api, gate);
  void surfaceRegistration.then(({
    registration,
    initialRuntimeSeed
  }) => gate.activate(registration, initialRuntimeSeed ? createTuiInitialLoadCoordinator(initialRuntimeSeed) : undefined));
  registerStableTuiSlots(api, gate.current);
}
const tui = async api => {
  const registrationGate = createTuiRegistrationGate();
  api.lifecycle.onDispose(() => {
    registrationGate.dispose();
    disposeQuotaTelemetryOwner(createTuiQuotaClient(api));
  });
  void initializeTuiRegistration(api, registrationGate).catch(() => {});
};
const pluginModule = {
  id,
  tui
};
export default pluginModule;
