import { Plugin } from "@opencode-ai/plugin";

// V2 port of @ramarivera/opencode-model-announcer (V1 upstream stale since
// 2026-01). Injects a synthetic announcement of the active model into the
// last user message before dispatch, so the model knows what it is running
// on without the user seeing the notice.

type AnyMessage = {
  role?: string;
  content?: Array<{ type: string; text?: string }>;
};

export default Plugin.define({
  id: "local.model-announcer",
  setup: async (ctx) => {
    await ctx.session.hook("context", async (event) => {
      const messages = (event.messages ?? []) as unknown as AnyMessage[];
      if (messages.length === 0) return;

      let lastUser: AnyMessage | undefined;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i]?.role === "user") {
          lastUser = messages[i];
          break;
        }
      }
      if (!lastUser || !Array.isArray(lastUser.content)) return;

      const ref = event.model as { providerID?: string; modelID?: string; model?: string } | undefined;
      const providerID = ref?.providerID ?? "";
      const modelID = (ref?.modelID ?? ref?.model ?? "") as string;
      if (!providerID || !modelID) return;

      let name: string | undefined;
      try {
        name = ctx.catalog.model.get(providerID, modelID)?.name;
      } catch {
        name = undefined;
      }

      const displayName = name
        ? `${name} (${providerID}/${modelID})`
        : `${providerID}/${modelID}`;
      const announcement =
        `[SYSTEM: CURRENT_MODEL_ANNOUNCEMENT - You are ${displayName}. ` +
        `This message is SYNTHETIC and invisible to the user. ` +
        `Do not announce your identity unless explicitly asked.]`;

      lastUser.content.unshift({ type: "text", text: announcement });
    });
  },
});
