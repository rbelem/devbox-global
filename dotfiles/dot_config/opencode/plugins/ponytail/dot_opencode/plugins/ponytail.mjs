// ponytail — OpenCode V2 plugin (local port).
//
// Injects the ponytail ruleset into every chat's system prompt at the active
// intensity. Reuses the shared instruction builder from the upstream npm
// package so Claude Code, Codex, pi, and OpenCode all read one source of
// truth. Slash commands and skills are installed globally (command/*.md and
// skills/ of this repo); the /ponytail command persists the mode by writing
// the state file itself (V2 has no command.execute.before hook).

import { Plugin } from '@opencode-ai/plugin';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The shared instruction builders are CommonJS; bridge from this ES module.
const require = createRequire(import.meta.url);
const { getPonytailInstructions } = require('../../hooks/ponytail-instructions');
const { getDefaultMode, normalizePersistedMode } = require('../../hooks/ponytail-config');

const statePath = path.join(
  process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'),
  'opencode',
  '.ponytail-active',
);

function readMode() {
  try {
    return normalizePersistedMode(fs.readFileSync(statePath, 'utf8').trim()) || getDefaultMode();
  } catch {
    return getDefaultMode();
  }
}

export default Plugin.define({
  id: 'local.ponytail',
  setup: async (ctx) => {
    // Append the ruleset to the system prompt every turn.
    await ctx.session.hook('context', (event) => {
      const mode = readMode();
      if (mode === 'off') return;
      const instructions = getPonytailInstructions(mode);
      if (!Array.isArray(event.system)) return;
      const system = event.system;
      const last = system[system.length - 1];
      if (last && last.type === 'text' && typeof last.text === 'string') {
        last.text += '\n\n' + instructions;
      } else {
        system.push({ type: 'text', text: instructions });
      }
    });
  },
});
