// Dev-only script — DO NOT ship in the .exe.
//
// Wipes the local SQLite database (and its WAL/SHM siblings) and re-seeds it
// from a frozen snapshot of the user's open Linear issues that was captured
// once via the Cursor / Claude Linear MCP. The snapshot lives at
// scripts/data/linear-snapshot.json — re-capture it manually whenever you want
// fresher data; the running app does NOT consult this file.
//
// Usage (from the repo root):
//
//     node scripts/seed-from-linear-mcp.mjs
//
// Optional flags:
//
//     --user-data <path>          Override app.getPath('userData')
//     --keep-wal                  Don't delete the WAL/SHM siblings
//     --dry-run                   Print what would happen and exit
//     --include-unassigned        Also seed tasks the snapshot user *created*
//                                 but hasn't been assigned (mirrors the per-
//                                 provider config flag).
//
// Round-5 contract: this seed only loads issues the snapshot's `assignee`
// owns. The snapshot itself is captured assignee-scoped via the Linear MCP
// (`assignee: { isMe: true }`) — DO NOT re-capture it without that filter.
//
// Implementation notes:
// - We don't import anything from src/main because that pulls in Electron's
//   `app` module, which isn't available outside the Electron runtime.
// - We embed the schema migrations inline so this script stays self-contained.
//   If migrations move, update MIGRATIONS below — see src/main/db/schema.ts
//   for the canonical list.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// `better-sqlite3` is rebuilt against Electron's Node ABI by `electron-builder
// install-app-deps`. Plain `node` will fail to load the .node binary with a
// NODE_MODULE_VERSION mismatch — re-exec under Electron's bundled Node via
// ELECTRON_RUN_AS_NODE=1 so the ABI matches.
if (!process.versions.electron && !process.env.SEED_LINEAR_BOOTSTRAPPED) {
  const electronBin = join(
    __dirname,
    "..",
    "node_modules",
    ".bin",
    process.platform === "win32" ? "electron.cmd" : "electron",
  );
  if (!existsSync(electronBin)) {
    console.error(
      `Could not find Electron at ${electronBin}. Run 'npm install' first.`,
    );
    process.exit(1);
  }
  const result = spawnSync(
    electronBin,
    [fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "1",
        ELECTRON_ENABLE_LOGGING: "1",
        SEED_LINEAR_BOOTSTRAPPED: "1",
      },
    },
  );
  process.exit(result.status ?? 0);
}

const Database = (await import("better-sqlite3")).default;

const APP_NAME = "attensi-time-tracker";
const DB_FILENAME = "timetracker.sqlite";
const INTEGRATION_ID = "linear";

function parseArgs(argv) {
  const out = {
    userData: null,
    keepWal: false,
    dryRun: false,
    includeUnassigned: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--user-data") out.userData = argv[++i] ?? null;
    else if (a === "--keep-wal") out.keepWal = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--include-unassigned") out.includeUnassigned = true;
    else if (a === "--help" || a === "-h") {
      console.log(
        "Usage: node scripts/seed-from-linear-mcp.mjs [--user-data <path>] [--keep-wal] [--dry-run] [--include-unassigned]",
      );
      process.exit(0);
    }
  }
  return out;
}

function defaultUserDataDir() {
  // Match Electron's app.getPath('userData') for this build:
  //   Windows  → %APPDATA%\<appName>
  //   macOS    → ~/Library/Application Support/<appName>
  //   Linux    → ~/.config/<appName>
  if (process.platform === "win32") {
    const base = process.env.APPDATA;
    if (!base) {
      throw new Error(
        "APPDATA is not set — pass --user-data <path> explicitly.",
      );
    }
    return join(base, APP_NAME);
  }
  if (process.platform === "darwin") {
    return join(
      process.env.HOME || "",
      "Library",
      "Application Support",
      APP_NAME,
    );
  }
  return join(process.env.HOME || "", ".config", APP_NAME);
}

function newId(prefix) {
  const id = (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  )
    .replace(/-/g, "")
    .slice(0, 12);
  return prefix ? `${prefix}_${id}` : id;
}

// Mirror src/main/db/schema.ts. Keep these in sync — if migrations there
// change, mirror them here so a freshly seeded DB matches what the app expects.
const MIGRATIONS = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS projects (
        id              TEXT PRIMARY KEY,
        name            TEXT NOT NULL,
        color           TEXT NOT NULL,
        ticket_prefix   TEXT,
        integration_id  TEXT,
        archived_at     INTEGER
      );
      CREATE TABLE IF NOT EXISTS tasks (
        id           TEXT PRIMARY KEY,
        project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        ticket       TEXT,
        title        TEXT NOT NULL,
        tag          TEXT,
        archived_at  INTEGER,
        created_at   INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000)
      );
      CREATE INDEX IF NOT EXISTS tasks_project_idx ON tasks(project_id);
      CREATE INDEX IF NOT EXISTS tasks_active_idx  ON tasks(archived_at) WHERE archived_at IS NULL;
      CREATE TABLE IF NOT EXISTS entries (
        id          TEXT PRIMARY KEY,
        task_id     TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        started_at  INTEGER NOT NULL,
        ended_at    INTEGER,
        source      TEXT NOT NULL CHECK (source IN ('manual','fill','teams','idle_recover','sprint')),
        note        TEXT
      );
      CREATE INDEX IF NOT EXISTS entries_task_idx    ON entries(task_id);
      CREATE INDEX IF NOT EXISTS entries_started_idx ON entries(started_at);
      CREATE INDEX IF NOT EXISTS entries_open_idx    ON entries(ended_at) WHERE ended_at IS NULL;
      CREATE TABLE IF NOT EXISTS captures (
        id           TEXT PRIMARY KEY,
        text         TEXT NOT NULL,
        tag          TEXT,
        created_at   INTEGER NOT NULL,
        archived_at  INTEGER
      );
      CREATE INDEX IF NOT EXISTS captures_active_idx ON captures(created_at) WHERE archived_at IS NULL;
      CREATE TABLE IF NOT EXISTS nudges (
        kind               TEXT PRIMARY KEY,
        last_shown_at      INTEGER,
        last_dismissed_at  INTEGER,
        payload            TEXT
      );
      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `,
  },
  {
    version: 2,
    sql: `
      CREATE TABLE IF NOT EXISTS custom_tags (
        id          TEXT PRIMARY KEY,
        label       TEXT NOT NULL UNIQUE,
        created_at  INTEGER NOT NULL
      );
    `,
  },
  {
    version: 3,
    sql: `ALTER TABLE tasks ADD COLUMN completed_at INTEGER`,
  },
  {
    version: 4,
    sql: `ALTER TABLE tasks ADD COLUMN integration_id TEXT`,
  },
  {
    version: 5,
    sql: `
      ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'none';
      ALTER TABLE tasks ADD COLUMN external_url TEXT;
      ALTER TABLE tasks ADD COLUMN updated_at INTEGER;
      UPDATE tasks SET updated_at = created_at WHERE updated_at IS NULL;
      CREATE TABLE IF NOT EXISTS entry_sync (
        entry_id          TEXT PRIMARY KEY REFERENCES entries(id) ON DELETE CASCADE,
        provider          TEXT NOT NULL,
        remote_id         TEXT NOT NULL,
        remote_updated_at INTEGER,
        synced_at         INTEGER NOT NULL,
        conflict          INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS entry_sync_provider_idx ON entry_sync(provider);
      CREATE TABLE IF NOT EXISTS integration_cache (
        provider     TEXT NOT NULL,
        resource     TEXT NOT NULL,
        etag         TEXT,
        updated_at   INTEGER NOT NULL,
        payload      TEXT NOT NULL,
        PRIMARY KEY (provider, resource)
      );
    `,
  },
];

function runMigrations(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY)`);
  const row = db
    .prepare("SELECT MAX(version) AS v FROM schema_version")
    .get();
  const current = row?.v ?? 0;
  for (const m of MIGRATIONS) {
    if (m.version > current) {
      db.transaction(() => {
        db.exec(m.sql);
        db.prepare("INSERT INTO schema_version (version) VALUES (?)").run(
          m.version,
        );
      })();
    }
  }
}

function pickPrimaryTag(labels) {
  if (!labels || labels.length === 0) return null;
  // Prefer "bug" / "regression" over generic labels so the tag chip is
  // immediately useful in the Tasks tab.
  const priority = ["bug", "regression", "Improvement", "Story"];
  for (const want of priority) {
    const hit = labels.find(
      (l) => l && l.toLowerCase() === want.toLowerCase(),
    );
    if (hit) return hit;
  }
  return labels[0] ?? null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const userData = args.userData ?? defaultUserDataDir();
  const dbPath = join(userData, DB_FILENAME);
  const snapshotPath = join(__dirname, "data", "linear-snapshot.json");

  if (!existsSync(snapshotPath)) {
    throw new Error(
      `Snapshot not found at ${snapshotPath}. Re-capture it via the Linear MCP and re-run.`,
    );
  }

  const snapshot = JSON.parse(readFileSync(snapshotPath, "utf-8"));
  const teams = snapshot.teams || [];
  const issues = snapshot.issues || [];

  console.log("Linear MCP seed");
  console.log(`  user-data dir : ${userData}`);
  console.log(`  database file : ${dbPath}`);
  console.log(`  snapshot file : ${snapshotPath}`);
  console.log(`  teams         : ${teams.length}`);
  console.log(`  issues        : ${issues.length}`);
  if (args.dryRun) {
    console.log("Dry run — no files written.");
    return;
  }

  // 1. Wipe.
  for (const candidate of [
    dbPath,
    args.keepWal ? null : `${dbPath}-wal`,
    args.keepWal ? null : `${dbPath}-shm`,
    args.keepWal ? null : `${dbPath}-journal`,
  ]) {
    if (!candidate) continue;
    if (existsSync(candidate)) {
      rmSync(candidate, { force: true });
      console.log(`  wiped: ${candidate}`);
    }
  }
  mkdirSync(userData, { recursive: true });

  // 2. Open + migrate.
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  runMigrations(db);

  // 3. Seed.
  const teamById = new Map();
  const insertProject = db.prepare(
    `INSERT INTO projects (id, name, color, ticket_prefix, integration_id, archived_at)
     VALUES (@id, @name, @color, @ticketPrefix, @integrationId, @archivedAt)`,
  );
  const insertTask = db.prepare(
    `INSERT INTO tasks (
       id, project_id, ticket, title, tag,
       archived_at, completed_at, created_at, updated_at,
       integration_id, priority, external_url
     )
     VALUES (
       @id, @projectId, @ticket, @title, @tag,
       @archivedAt, @completedAt, @createdAt, @updatedAt,
       @integrationId, @priority, @externalUrl
     )`,
  );

  // Round-5 priority remap: Linear `1` is urgent, `2` high, `3` medium,
  // `4` low, anything else `none`. Snapshot may carry the literal string
  // already (preferred) or the numeric scale.
  function mapPriority(raw) {
    if (raw === "urgent" || raw === "high" || raw === "medium" || raw === "low" || raw === "none") {
      return raw;
    }
    if (raw === 1) return "urgent";
    if (raw === 2) return "high";
    if (raw === 3) return "medium";
    if (raw === 4) return "low";
    return "none";
  }

  function buildLinearUrl(ticket, workspace) {
    if (!ticket || !workspace) return null;
    return `https://linear.app/${workspace}/issue/${ticket}`;
  }

  const workspaceSlug = snapshot.workspace || "attensi";
  const snapshotAssignee = snapshot.assignee ?? null;

  const trx = db.transaction(() => {
    const usedTeamIds = new Set(issues.map((i) => i.teamId));
    for (const team of teams) {
      if (!usedTeamIds.has(team.id)) continue;
      const projectId = newId("prj");
      teamById.set(team.id, projectId);
      insertProject.run({
        id: projectId,
        name: team.name,
        color: team.color,
        ticketPrefix: team.ticketPrefix ?? null,
        integrationId: INTEGRATION_ID,
        archivedAt: null,
      });
    }
    const now = Date.now();
    let skippedUnassigned = 0;
    for (const issue of issues) {
      // Round-5: assignee-scoped seeding. The snapshot is captured filtered
      // by `assignee: { isMe: true }`; this is a defence-in-depth guard for
      // any older snapshot that included extra issues. With
      // `--include-unassigned`, fall back to the snapshot user as creator.
      if (snapshotAssignee && issue.assignee) {
        if (issue.assignee !== snapshotAssignee) {
          if (!args.includeUnassigned || issue.creator !== snapshotAssignee) {
            skippedUnassigned++;
            continue;
          }
        }
      }
      const projectId = teamById.get(issue.teamId);
      if (!projectId) {
        console.warn(`  skipped issue ${issue.id} — unknown team`);
        continue;
      }
      insertTask.run({
        id: newId("tsk"),
        projectId,
        ticket: issue.id,
        title: issue.title,
        tag: pickPrimaryTag(issue.labels),
        archivedAt: null,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
        integrationId: INTEGRATION_ID,
        priority: mapPriority(issue.priority),
        externalUrl: buildLinearUrl(issue.id, workspaceSlug),
      });
    }
    if (skippedUnassigned > 0) {
      console.log(
        `  skipped ${skippedUnassigned} issue(s) not assigned to ${snapshotAssignee}`,
      );
    }
  });
  trx();

  console.log(`  seeded ${teamById.size} project(s) and ${issues.length} task(s).`);
  db.close();
  console.log("Done. Boot the app — the Tasks tab should show your Linear backlog.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
