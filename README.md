# Attensi Time Tracker

[![CI](https://github.com/attensi/timetracker/actions/workflows/ci.yml/badge.svg)](https://github.com/attensi/timetracker/actions/workflows/ci.yml)
[![Latest release](https://img.shields.io/github/v/release/attensi/timetracker?label=release)](https://github.com/attensi/timetracker/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A calm Windows desktop time tracker. Lives in a small floating pill, captures
brain-dumps anywhere, recovers gracefully from idle, and exports clean CSV for
Sheets / Toggl / Harvest. Local-only — your data never leaves the machine.

Stack: Electron 32 + Vite + React 18 + TypeScript, with `better-sqlite3` for
storage and Zod-validated IPC.

---

## Install (end users)

1. Grab the latest `AttensiTimeTracker-<version>-x64-setup.exe` (NSIS installer)
   or `AttensiTimeTracker-<version>-portable.exe` (no install) from the
   [Releases page](https://github.com/attensi/timetracker/releases/latest).
2. Double-click. Windows SmartScreen will likely show a blue warning because the
   binary isn't code-signed yet — click **More info → Run anyway**. This is a
   one-time prompt for the installer; the portable build prompts each launch.
3. On first run the **Intro** window appears. Pick a name, tick the
   integrations you'd like to mock, click **Get started**. The pill appears in
   the top-right of your primary display.

The app stores everything in:

```
%APPDATA%\Attensi Time Tracker\timetracker.sqlite
```

To wipe all data: quit the app, delete that file, relaunch. Toggle "open at
login" in **Settings → General**.

---

## Day-to-day shortcuts

Five global shortcuts. They work even when another app has focus.

| Action                     | Shortcut               |
| -------------------------- | ---------------------- |
| Start / pause current task | `Ctrl + Space`         |
| Switch task (open picker)  | `Ctrl + Shift + Space` |
| Expand / collapse window   | `Ctrl + E`             |
| Brain dump                 | `Ctrl + B`             |
| Show shortcut cheatsheet   | `Ctrl + /`             |

The full sheet is in **Help → Keyboard shortcuts** or via the chevron on the
right edge of the pill.

---

## Develop

Requirements: Node 20+, Windows 10/11.

```powershell
npm install
npm run dev
```

`electron-vite` runs Vite for the renderer and tsc for the main process; the
Electron app launches once both are ready. Live reload covers both processes.

### One-line health check

```powershell
npm run check     # typecheck + lint + unit tests
```

CI runs the same command. Aim is < 60 s on a clean clone.

### All scripts

```powershell
npm run dev               # development with HMR
npm run build             # production build into out/
npm run typecheck         # tsc -p main + renderer
npm run lint              # eslint (errors on `any`, console.log, etc.)
npm run lint:fix          # eslint --fix
npm run format            # prettier --write
npm run format:check      # prettier --check
npm run test              # vitest run
npm run test:watch        # vitest --watch
npm run test:coverage     # vitest with v8 coverage
npm run test:e2e          # playwright (smoke; needs a `npm run build` first)
npm run check             # typecheck + lint + test
npm run dist:win          # build + nsis + portable into release/
npm run dist:win:portable # portable only (faster)
```

The first install runs `electron-builder install-app-deps`, which rebuilds
`better-sqlite3` against the bundled Electron ABI. If you bump Electron, run
`npm run rebuild` once.

### Repo layout

```
src/
  main/           Electron main process (windows, services, ipc, db)
  renderer/       React UI: components, features (one folder per window),
                  themes, lib (pure utils), store (Zustand slices)
  shared/         Types, Zod schemas and constants used by both sides
tests/
  unit/           Vitest tests for lib/ and shared/schemas
  e2e/            Playwright smoke test
build/icon.ico    tray + installer icon
electron-builder.yml   NSIS + portable Win targets
```

A deeper tour is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
First-time contributors should start with [`docs/ONBOARDING.md`](docs/ONBOARDING.md).
Why-we-chose-X explanations live in [`docs/DECISIONS.md`](docs/DECISIONS.md).

---

## Packaging notes

- Targets: Windows x64 only. NSIS installer (with optional install dir) and
  single-file portable.
- Native module: `better-sqlite3` is rebuilt for Electron during `postinstall`.
  `asarUnpack` covers `.node` and `.dll` so the binary loads at runtime.
- Code signing: not configured. The installer + portable will trigger
  SmartScreen until they build reputation. For v2 we recommend **Azure Trusted
  Signing** (cheap, no HSM).
- Auto-update: not wired in v1.
- macOS / Linux: not built (the design and shortcuts target Windows).

After `npm run dist:win` the artefacts land in `release/`:

```
release/
  AttensiTimeTracker-0.1.0-x64-setup.exe
  AttensiTimeTracker-0.1.0-portable.exe
  win-unpacked/                              (raw app for debugging)
```

CI builds these for every tag push (see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
and the workflows in `.github/workflows/`).

---

## Mocked integrations

Linear / Jira / Asana / Slack / Teams / GitHub / Google Calendar / Notion are
all UI-only in v1. They appear in **Settings → Integrations** and are tagged
**Demo**. The `View → Demo` menu can spawn the Slack, Teams, Idle-recovery and
Retro-fill toasts plus the Linear integration panel for screenshotting.

---

## License

MIT — see `LICENSE`.
