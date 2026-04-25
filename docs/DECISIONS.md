# Decisions

Short ADR-style log. Every entry: **date**, **decision**, **why**,
**alternatives considered**. Keep entries short — link out for detail.

---

## 2026-04-22 — Use Electron over Tauri

**Decision.** Build on Electron 32.

**Why.**

- The team owns Node + Chromium muscle memory; Tauri's Rust + WebView2 stack
  would slow us down and shift the bug surface to a place we can't debug
  quickly.
- Native modules (`better-sqlite3`) are first-class in Electron's prebuilt
  distribution. WebView2 + Rust would require us to ship a stable Rust SQLite
  binding and deal with Edge runtime versioning quirks.
- A single React/TS codebase for renderer **and** Node services means our
  domain types live in one place (`src/shared/`).
- Final binary is bigger (~120 MB), but our distribution is internal-first;
  we'd rather pay the size tax than the developer-hours tax.

**Alternatives.**

- _Tauri 2_ — smaller binaries but requires Rust + WebView2; would block
  hiring.
- _.NET WPF / WinUI_ — best-in-class on Windows but locks us out of the
  React/Tailwind design system the team already uses.
- _Web app + system tray helper_ — auth + file access surface too heavy for a
  feature this calm.

---

## 2026-04-22 — Mock all integrations in v1

**Decision.** Linear, Jira, Slack, Teams, GitHub, Google Calendar, Notion all
appear in the UI but never make a network call. Toggling them on persists a
"connected" flag and the demo content surfaces.

**Why.**

- Each real integration is at least a week of OAuth + rate-limit + error UX
  work. Shipping seven of them blocks v1 by months.
- The UX flows we actually want to test (idle recovery, retro fill, brain
  dump, CSV export) don't need real integrations to be exercised.
- Mocked tiles let us validate the **design** of integration cards with users
  before paying the implementation cost.

**Alternatives.**

- _Ship Linear-only first_ — was tempting, but means we can't demo the
  integration grid at full strength.
- _Skip integrations entirely in v1_ — loses the visual hook that makes
  reviewers go "oh, this is for a real workflow."

We'll un-mock one integration at a time in v1.x, starting with Linear (most
common ticketing system in the team).

---

## 2026-04-22 — SQLite over IndexedDB / file-per-record

**Decision.** Persist everything in `%APPDATA%\Attensi Time Tracker\timetracker.sqlite`
via `better-sqlite3`.

**Why.**

- The data is unambiguously relational: tasks, entries, projects, captures,
  nudges. Joins are useful (today's hours per project, etc.).
- `better-sqlite3` is synchronous and ~10x faster than the asynchronous
  alternatives for our workload. The renderer never sees the call directly,
  so blocking the main thread for a few ms per query is fine.
- One file = one easy backup, one easy "wipe my data" answer.
- IndexedDB lives inside Chromium's userdata folder, can't be opened by other
  tools, and complicates "my data" portability.

**Alternatives.**

- _IndexedDB / Dexie_ — would force us to push every read through IPC, and
  we'd still need a queryable layer for joins.
- _PouchDB / RxDB_ — unnecessary distributed complexity for a local-only app.
- _Plain JSON files_ — fine until 6 months in, when listing entries by week
  starts costing 200 ms.

The trade-off is `better-sqlite3` being a native module → we rebuild it for
Electron's Node ABI in `postinstall`. Worth it.

---

## 2026-04-22 — No auto-update in v1

**Decision.** v1 builds do **not** ship `electron-updater`. Releases happen
through GitHub Releases; users download a fresh `.exe` themselves.

**Why.**

- Auto-update needs a code-signing certificate. We don't have one yet, and
  un-signed updates would trigger SmartScreen on every release (worse than
  the current "warn-once-per-installer" experience).
- Users in our target group are technical and check Slack for release notes
  anyway.
- Cuts operational complexity (no update server, no rollback strategy needed)
  and keeps the threat model trivial: the user is the only one who can
  install code.

**Alternatives.**

- _electron-updater + GitHub Releases_ — well-trodden path; we'll move to it
  in v1.x once we have a code-signing certificate (Azure Trusted Signing is
  the leading candidate).
- _Squirrel.Windows_ — abandoned, harder to debug.
- _MSIX_ — best Windows-native UX, but we'd need to ship through the Store
  or set up enterprise sideloading; not worth the complexity for v1.

---

## 2026-04-22 — Five global shortcuts, no more

**Decision.** Reduce the previous 9 shortcut set to five verbs:

| Action            | Shortcut               |
| ----------------- | ---------------------- |
| Start / pause     | `Ctrl + Space`         |
| Switch task       | `Ctrl + Shift + Space` |
| Expand / collapse | `Ctrl + E`             |
| Brain dump        | `Ctrl + B`             |
| Show shortcuts    | `Ctrl + /`             |

**Why.**

- The previous set (`Ctrl+K`, `Ctrl+Shift+F`, `Ctrl+Shift+P`, `Ctrl+.`, `?`,
  …) had overlapping mental models and one of them (`?`) collided with text
  input.
- Five shortcuts fit on one cheatsheet card without scrolling.
- The remaining actions (fill gaps, focus sprint, hide pill) are reachable
  via the expanded UI or settings — they don't need to be invokable from
  another app.

**Alternatives.**

- _Keep the full set_ — discoverability suffered; users learnt 2-3 and forgot
  the rest.
- _Make shortcuts user-configurable_ — premature; ship with sane defaults
  first, gather feedback, then add a remap UI if anyone asks.
