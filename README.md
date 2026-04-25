# Attensi Time Tracker

A calm Windows desktop time tracker. Lives in a small floating pill, captures
brain-dumps anywhere, recovers gracefully from idle, and exports clean CSV for
Sheets / Toggl / Harvest. Local-only — your data never leaves the machine.

Stack: Electron 32 + Vite + React 18 + TypeScript + Tailwind, with
`better-sqlite3` for storage and Zod-validated IPC.

---

## Install (end users)

1. Grab the latest `AttensiTimeTracker-<version>-x64-setup.exe` (NSIS installer)
   or `AttensiTimeTracker-<version>-portable.exe` (no install) from the
   `release/` folder of a build.
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

To wipe all data: quit the app, delete that file, relaunch.

By default the app launches at login. Toggle this in **Settings → General →
Auto-launch on Windows boot**.

---

## Day-to-day shortcuts

| Action                  | Shortcut          |
| ----------------------- | ----------------- |
| Start / pause timer     | `Ctrl + Space`    |
| Brain dump (anywhere)   | `Ctrl + Shift + K`|
| Switch task             | `Ctrl + Shift + S`|
| Fill gaps               | `Ctrl + Shift + F`|
| Focus sprint            | `Ctrl + Shift + P`|
| Expand / collapse pill  | `Ctrl + E`        |
| Hide pill               | `Ctrl + .`        |
| Show keyboard sheet     | `F1`              |

A full sheet is in **Help → Keyboard shortcuts** or via the `?` button in the
expanded window.

---

## Develop

Requirements: Node 20+, Windows 10/11.

```powershell
npm install
npm run dev
```

`electron-vite` runs Vite for the renderer and tsc for the main process; the
Electron app launches once both are ready. Live reload covers both processes.

Useful scripts:

```powershell
npm run typecheck       # tsc on main + renderer
npm run build           # production build into out/
npm run dist:win        # build + nsis + portable into release/
npm run dist:win:portable  # portable only (faster)
```

The first install runs `electron-builder install-app-deps`, which rebuilds
`better-sqlite3` against the bundled Electron ABI. If you bump Electron, run
`npm run rebuild` once.

### Repo layout

```
electron/
  main.ts                  app lifecycle, services, app menu
  preload.ts               contextBridge → window.attensi
  shared/ipc.ts            Zod schemas for every IPC channel + event
  db/                      better-sqlite3 connection, migrations, repos
  ipc/                     ipcMain handlers + broadcast helper
  services/                idle, shortcuts, tray, autolaunch, csv, menu
  windows/                 BrowserWindow factory + manager
src/
  shared/                  tokens.css, primitives, hotkeys, time, store, api
  windows/                 pill / expanded / dashboard / intro / toast /
                           settings / cheatsheet / integration React trees
  bootstrap.tsx            picks the right root from ?window=…
build/icon.ico             tray + installer icon
electron-builder.yml       NSIS + portable Win targets
```

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

---

## Mocked integrations

Linear / Jira / Asana / Slack / Teams / GitHub / Google Calendar / Notion are
all UI-only in v1. They appear in **Settings → Integrations** and are tagged
**Demo**. The `View → Demo` menu can spawn the Slack, Teams, Idle-recovery and
Retro-fill toasts plus the Linear integration panel for screenshotting.

---

## License

MIT — see `LICENSE`.
