#!/usr/bin/env bash
# Install herdr plugins once per machine (chezmoi run_once script).
# The keybinding lives in dot_config/herdr/config.toml ([[keys.command]]),
# which chezmoi syncs everywhere; this script installs the plugin itself.
# Plugin updates: bump --ref here, or `herdr plugin install <src> --ref <tag> --yes` manually.
set -euo pipefail

if ! command -v herdr >/dev/null 2>&1; then
  echo "herdr not on PATH — skipping plugin install"
  exit 0
fi

herdr plugin install thanhdat77/herdr-navigator --ref v0.3.3 --yes \
  && herdr plugin enable herdr-navigator \
  || { echo "plugin install failed (old herdr server? run again after restarting herdr)"; exit 0; }

herdr plugin list
