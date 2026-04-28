# Architecture

A one-page tour of how Attensi Time Tracker is wired. Read this before making
non-trivial changes.

## Three windows, one process tree

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Electron main process                        │
│                                                                       │
│   src/main/index.ts        boots app, loads settings, registers IPC   │
│   src/main/windows/        one file per BrowserWindow kind            │
│   src/main/services/       idle poller, global shortcuts, tray, menu  │
│   src/main/db/             better-sqlite3 connection + repositories   │
│   src/main/ipc/            ipcMain handlers (timer, captures, …)      │
└──────────┬─────────────────────┬────────────────────────────┬─────────┘
           │ contextBridge       │ contextBridge              │ contextBridge
           ▼                     ▼                            ▼
   ┌──────────────┐      ┌────────────────┐         ┌──────────────────┐
   │   Pill       │      │   Expanded      │         │   Dashboard /    │
   │  (always on) │◀────▶│   (Ctrl+E)      │◀──────▶│   Settings /     │
   │              │      │  timer · inbox  │         │   Cheatsheet …   │
   └──────────────┘      │  fill · list    │         └──────────────────┘
                         └────────────────┘
```

- **Pill** — frameless, 380×56 px (180 with brain-dump open), always on top,
  draggable. Hosts play/pause, brain-dump, expand chevron.
- **Expanded** — main 4-tab work surface (Timer · Tasks · Inbox · Fill gaps),
  positioned beside the pill. Toggled with `Ctrl+E` or the chevron.
- **Helper windows** — Dashboard, Settings, Cheatsheet, Toasts, Intro,
  Integration panels. Each is a singleton owned by a file in
  `src/main/windows/`.

All windows are React apps loaded from the same Vite bundle; the entry point
(`src/renderer/bootstrap.tsx`) inspects `?window=<kind>` to pick the right
root component.

## IPC flow

End-to-end typed via `src/shared/schemas.ts`:

```
renderer  ──rpc('task:start', { taskId })──▶  preload (Zod-validated)
                                              │
                                              ▼
                            src/main/ipc/timer.ts handler
                                              │
                                              ▼
                       src/main/db/repos/* (better-sqlite3)
                                              │
                                              ▼
                broadcastChanges({ current, tasks })
                                              │
                                              ▼
       all renderers receive 'current:changed' / 'tasks:changed'
                                              │
                                              ▼
                         Zustand slice updates → UI re-renders
```

Two contracts:

- **`CHANNELS`** — request/response (`ipcMain.handle` ↔ `rpc(…)`).
- **`EVENTS`** — fire-and-forget broadcasts (`webContents.send` ↔ `on(…)`).

Both are typed in `src/shared/schemas.ts`. Adding a channel is **one** entry
in that map plus a `register('foo', handler)` call in
`src/main/ipc/<group>.ts`. The renderer types update automatically.

## Data flow

```
SQLite (~/AppData/Roaming/Attensi Time Tracker/timetracker.sqlite)
   │
   ▼
src/main/db/repos/*  (typed query helpers — settings, tasks, entries, …)
   │
   ▼
src/main/ipc/*       (handlers; no SQL inside, only repo calls)
   │
   ▼
preload  →  renderer Zustand store  →  React components
```

Components never call `ipcMain` or `better-sqlite3` directly. The store is the
only owner of remote state on the renderer side.

## Where to find things

| You want to…                   | Look in…                                                                                                                                              |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tweak a window size / position | `src/main/windows/<kind>.ts`                                                                                                                          |
| Add a global keyboard shortcut | `src/shared/hotkeys.ts` + `src/main/services/shortcuts.ts`                                                                                            |
| Add an IPC channel             | `src/shared/schemas.ts` + `src/main/ipc/<group>.ts`                                                                                                   |
| Add a settings field           | `src/shared/models.ts` (ZSettings) + `src/shared/constants.ts` (DEFAULT_SETTINGS) + Settings UI section in `src/renderer/features/settings/sections/` |
| Add a DB column                | `src/main/db/schema.sql` + a numbered migration in `src/main/db/migrations/`                                                                          |
| Change theme tokens            | `src/renderer/themes/tokens.css` + `src/renderer/themes/themes.ts`                                                                                    |
| Reduce or rename the icons     | `src/renderer/components/Icons.tsx`                                                                                                                   |

## Integrations

Every integration provider (Linear, Jira, Asana, GitHub, Notion, GCal,
Slack, Teams) ships with the same contract:

- **Assignee-scoped fetches only**. Providers MUST use the source's native
  filter (`assignee: { isMe: true }` / `assignee = currentUser()` /
  `assignee:@me`) and never pull-then-filter on the client. The shared
  `IntegrationConfig.assigneeOnly` defaults to `true`. Aggregation or
  team-wide views are explicitly out of scope — Attensi Time Tracker is a
  personal tracker.
- **Opt-in unassigned-but-mine**. Some workflows (solo / personal
  boards) rely on tasks the user _created_ even when the assignee field
  is empty. The per-provider `includeUnassignedICreated` toggle in
  Settings → Integrations enables this; default off.
- **Centralised metadata** in `src/shared/integrations/registry.ts`
  (label, brand color, URL template, single-glyph mark). Both renderer
  chips and main-side audit logs read from this map. Adding a provider =
  one entry here + one provider class in `src/main/integrations/providers/`.
- **Polite networking** is owned by `src/main/integrations/httpClient.ts`
  and `src/main/integrations/cache.ts`:
  - SQLite-backed response cache (table `integration_cache`) with
    `etag` + `updated_at` columns.
  - Conditional requests (`If-None-Match`) when an ETag exists.
  - Background refresh every 15 min; on focus refresh if older than 5
    min; manual refresh bypasses the floor.
  - Request coalescing (2s window) and rate-limit awareness
    (`X-RateLimit-Remaining`, `Retry-After`).
- **Tempo bridge**. When Jira is connected and the Tempo REST API
  responds on probe, the per-provider config exposes a Tempo block.
  Local entries push to Tempo as worklogs (idempotent via
  `entry_sync.remote_id`). See `docs/INTEGRATIONS.md` for the full sync
  state machine.

## Build pipeline

```
npm run build      → electron-vite       → out/{main,preload,renderer}
npm run dist:win   → ↑ + electron-builder → release/*.exe
                                            release/latest.yml
```

CI runs `npm run check` on every PR, packages a portable `.exe` when a PR is
labeled `build-preview`, and produces signed releases on `v*` tag pushes. See
`.github/workflows/`.
