# Onboarding

You're new to the codebase. Here's the shortest path from `git clone` to
shipping your first PR.

## 0. Prerequisites

- Node 20.x (LTS). Windows 10/11. PowerShell 7 or Git Bash both work.
- A clean clone in a path **without spaces** (better-sqlite3's native build is
  picky about that).

## 1. Get it running locally

```powershell
git clone https://github.com/attensi/timetracker.git
cd timetracker
npm install        # also rebuilds better-sqlite3 for Electron
npm run dev        # opens the pill + expanded windows with HMR
```

If `npm install` fails on `better-sqlite3`, install
[Visual C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
once and rerun.

## 2. Confirm everything is green

```powershell
npm run check      # typecheck + lint + unit tests, < 60 s
```

If `check` fails on a clean clone, file an issue — that's a regression, not
your problem.

## 3. Tour the codebase

Read [`ARCHITECTURE.md`](ARCHITECTURE.md). It's one page and tells you what
each folder is for. The high-level mental model:

- `src/main/` — runs in Node, can touch the disk and the OS
- `src/renderer/` — runs in Chromium, only sees what `preload.ts` exposes
- `src/shared/` — types, Zod schemas, constants used by both

## 4. Where to find things

### Add or change a keyboard shortcut

1. Edit `src/shared/hotkeys.ts` — change the `SHORTCUTS` object. Five entries,
   one per line.
2. The cheatsheet (`src/renderer/features/cheatsheet/CheatsheetRoot.tsx`) and
   settings shortcuts table (`src/renderer/features/settings/sections/ShortcutsSection.tsx`)
   pick up the new label automatically.
3. If you added a brand new shortcut, also add a binding in
   `src/main/services/shortcuts.ts` (the `BINDINGS` array).

### Add a settings field

1. Update the schema in `src/shared/models.ts` (the `ZSettings` object).
2. Add the default in `src/shared/constants.ts` → `DEFAULT_SETTINGS`.
3. Add a UI control in the appropriate section under
   `src/renderer/features/settings/sections/`.
4. The DB layer (`src/main/db/repos/settings.ts`) reads/writes the whole
   object as JSON, so nothing to migrate unless you add new tables.

### Add a DB migration

1. Create `src/main/db/migrations/00X-<short-name>.sql` (zero-padded number).
2. The migration runner in `src/main/db/index.ts` picks it up on next launch.
3. If you're changing an existing table, also update `src/main/db/schema.sql`
   so a fresh install creates the right shape from the start.

### Add a new theme

1. Add tokens to `src/renderer/themes/tokens.css` (a new `[data-theme="x"]`
   block).
2. Register the id and label in `src/renderer/themes/themes.ts`.
3. Add the id to the `ZThemeId` enum in `src/shared/models.ts`.

### Add an IPC channel

1. Add `'mychannel:do': [zInput, zOutput]` to `CHANNELS` in
   `src/shared/schemas.ts`.
2. Implement the handler in the appropriate `src/main/ipc/<group>.ts`:
   `register('mychannel:do', async (input) => { … });`
3. Call it from the renderer with `await rpc('mychannel:do', input)` —
   the type inference is end-to-end.

## 5. House rules (the linter enforces these)

- No file over ~250 lines. Split if it grows.
- No `any`. Use `unknown` and validate with Zod.
- No `console.log` — use `logger('your-tag')` from `src/main/services/logger.ts`.
- No commented-out code, no TODOs without a ticket reference.
- One responsibility per file. Components don't talk to SQLite. SQL doesn't
  live in components.
- All cross-process strings go through `src/shared/constants.ts` or
  `src/shared/schemas.ts`.

## 6. Ship your first PR

1. Branch off `main`. Use a descriptive name (`feat/quick-pill-resize`).
2. Make commits in [Conventional Commits](https://www.conventionalcommits.org/)
   format — `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`. The
   commitlint hook will reject anything else.
3. `npm run check` locally before pushing.
4. Open a PR. CI runs the same `check` plus `npm run build`. If you'd like a
   `.exe` artifact for manual testing, add the `build-preview` label.
5. After approval & merge, tag a release with `npm version patch && git push --follow-tags`
   to ship.

Welcome aboard.
