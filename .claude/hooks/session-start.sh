#!/bin/bash
# SessionStart hook: give a Claude Code cloud session the same dev environment a fresh
# checkout gets from the README (Python venv + GUI node_modules), so tests run immediately.
# Local sessions are left alone. Hooks run on every start/resume and aren't cached, so each
# install is skipped while its lockfile is unchanged since the last run.
set -euo pipefail

[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

# Install output goes to stderr: a SessionStart hook's stdout becomes Claude's context.
# Usage: install_if_changed MANIFEST STAMP CMD... — runs CMD only when MANIFEST's hash
# differs from the one recorded in STAMP by the last successful run.
install_if_changed() {
  local manifest=$1 stamp=$2; shift 2
  local want
  want=$(sha256sum "$manifest" | cut -d' ' -f1)
  if [ "$(cat "$stamp" 2>/dev/null)" != "$want" ]; then
    "$@" >&2
    echo "$want" > "$stamp"
  fi
}

# Python: the repo's own bootstrap (creates .venv, installs the CI extras).
install_if_changed pyproject.toml .venv/.claude-pyproject.sha256 \
  bash packaging/setup_dev_env.sh
# GUI: `npm install` rather than `npm ci` so an existing node_modules is reused.
install_if_changed surfaces/gui/package-lock.json surfaces/gui/node_modules/.claude-lock.sha256 \
  npm install --prefix surfaces/gui --no-audit --no-fund

# The cloud image ships one Chromium and blocks `playwright install`; point the e2e suite
# at it (read by surfaces/gui/playwright.config.ts).
if [ -n "${CLAUDE_ENV_FILE:-}" ] && [ -x /opt/pw-browsers/chromium ]; then
  echo 'export PW_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium' >> "$CLAUDE_ENV_FILE"
fi
