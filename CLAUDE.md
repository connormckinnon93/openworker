# OpenWorker

Local-first AI coworker: a Python agent server (`coworker/`) plus a React UI in a Tauri desktop
shell (`surfaces/gui/`). See README.md for the product overview.

## Layout

- `coworker/` — Python backend: engine, model providers, connectors, MCP client, automations,
  sandboxes, team board (`teams/`). Server entry point: `coworker.server.run`.
- `tests/` — backend pytest suite. Shared fixtures (isolated state dir, `fake_slack`) live in
  `tests/conftest.py`.
- `surfaces/gui/` — React + Vite UI (`src/`), Tauri shell (`src-tauri/`), hermetic Playwright
  e2e (`e2e/`, every `/v1` call and the WebSocket mocked in `e2e/fixtures.ts`).
- `stt/` — Rust speech-to-text sidecar. `packaging/` — dev bootstrap and installer builds.

## Commands

Commands match CI (`.github/workflows/ci.yml`).

```shell
bash packaging/setup_dev_env.sh            # creates .venv with the [messaging,dev,bedrock] extras
.venv/bin/pytest tests -q                  # backend suite (~5 min); target a file while iterating
cd surfaces/gui && npm install             # GUI deps
npx tsc --noEmit                           # GUI typecheck (from surfaces/gui)
npm test                                   # GUI unit tests (vitest)
npm run e2e                                # hermetic Playwright e2e (~6 min)
```

## Conventions

- Comments explain *why*: the constraint, incident or owner decision behind the code. Match the
  surrounding comment density.
- UI strings go through i18n (`tt(...)`); add keys to both `src/locales/en.json` and `zh.json`.
- Keep `packaging/setup_dev_env.sh` extras in step with CI.
- Commit subjects are short, plain sentences, often `Area: what changed`.
- Upstream (andrewyng/openworker) asks for before/after screenshots on every PR.

## Claude Code cloud sessions

`.claude/hooks/session-start.sh` runs at session start in the cloud only. It installs `.venv` and
`surfaces/gui/node_modules`, skipping each when its lockfile hasn't changed, and exports
`PW_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium`. The image blocks `playwright install`, and
`playwright.config.ts` uses that browser when the variable is set.

Previewing the UI: there is no live preview pane in the cloud, so run the app in the container
and take screenshots.

```shell
.venv/bin/openworker-server --cwd . --port 8765 &   # first: it writes the token Vite reads on start
(cd surfaces/gui && npm run dev &)                  # http://localhost:1420
# from surfaces/gui:
node --input-type=module -e '
import { chromium } from "@playwright/test";
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_EXECUTABLE });
const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
await p.goto("http://localhost:1420"); await p.waitForTimeout(3000);
await p.screenshot({ path: process.argv[1] }); await b.close();' /path/to/shot.png
```

With no model key in the environment, the UI loads but shows "No model", so agent replies can't
be exercised. To test UI flows, prefer the mocked e2e suite.

These can't run in a cloud session: the Tauri desktop shell and installer builds, the macOS and
Windows sandboxes, STT audio input, and `npm run e2e:live` or real model runs (they need an API
key secret).
