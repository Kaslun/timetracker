import type { Database as Db } from "better-sqlite3";

interface Migration {
  version: number;
  up: (db: Db) => void;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: (db) => {
      db.exec(`
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
      `);
    },
  },
  {
    version: 2,
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS custom_tags (
          id          TEXT PRIMARY KEY,
          label       TEXT NOT NULL UNIQUE,
          created_at  INTEGER NOT NULL
        );
      `);
    },
  },
  {
    version: 3,
    up: (db) => {
      // SQLite has no IF NOT EXISTS for ADD COLUMN — guard via PRAGMA so a
      // re-run of an interrupted migration is harmless.
      const cols = db.prepare("PRAGMA table_info(tasks)").all() as {
        name: string;
      }[];
      if (!cols.some((c) => c.name === "completed_at")) {
        db.exec(`ALTER TABLE tasks ADD COLUMN completed_at INTEGER`);
      }
    },
  },
  {
    version: 4,
    up: (db) => {
      // Track per-task integration ownership so the task can be moved to a
      // local project but still be flagged "imported from Linear" (locking
      // title + ticket key edits).
      const cols = db.prepare("PRAGMA table_info(tasks)").all() as {
        name: string;
      }[];
      if (!cols.some((c) => c.name === "integration_id")) {
        db.exec(`ALTER TABLE tasks ADD COLUMN integration_id TEXT`);
      }
    },
  },
  {
    version: 5,
    up: (db) => {
      // Round-5 additions: per-task priority + canonical source URL +
      // explicit updated_at column (so "recently updated" sort works without
      // having to look at entries). Plus the integration_sync log table that
      // backs the request budget UI and Tempo idempotency.
      const cols = db.prepare("PRAGMA table_info(tasks)").all() as {
        name: string;
      }[];
      if (!cols.some((c) => c.name === "priority")) {
        db.exec(
          `ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'none'`,
        );
      }
      if (!cols.some((c) => c.name === "external_url")) {
        db.exec(`ALTER TABLE tasks ADD COLUMN external_url TEXT`);
      }
      if (!cols.some((c) => c.name === "updated_at")) {
        // Backfill to created_at so existing rows get a sensible default.
        db.exec(`ALTER TABLE tasks ADD COLUMN updated_at INTEGER`);
        db.exec(
          `UPDATE tasks SET updated_at = created_at WHERE updated_at IS NULL`,
        );
      }

      // Tempo worklog idempotency: maps a local entry to a remote worklog id
      // so re-syncing updates rather than duplicates. Conflict marker stays
      // null until detection finds a remote-side edit.
      db.exec(`
        CREATE TABLE IF NOT EXISTS entry_sync (
          entry_id          TEXT PRIMARY KEY REFERENCES entries(id) ON DELETE CASCADE,
          provider          TEXT NOT NULL,
          remote_id         TEXT NOT NULL,
          remote_updated_at INTEGER,
          synced_at         INTEGER NOT NULL,
          conflict          INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS entry_sync_provider_idx ON entry_sync(provider);
      `);

      // Per-provider request budget bookkeeping (ETag cache + last cursor).
      // Used by the cache layer + the debug panel.
      db.exec(`
        CREATE TABLE IF NOT EXISTS integration_cache (
          provider     TEXT NOT NULL,
          resource     TEXT NOT NULL,
          etag         TEXT,
          updated_at   INTEGER NOT NULL,
          payload      TEXT NOT NULL,
          PRIMARY KEY (provider, resource)
        );
      `);
    },
  },
];

export function runMigrations(db: Db): void {
  db.exec(
    `CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY)`,
  );
  const row = db
    .prepare("SELECT MAX(version) AS v FROM schema_version")
    .get() as { v: number | null };
  const current = row?.v ?? 0;
  for (const m of MIGRATIONS) {
    if (m.version > current) {
      const trx = db.transaction(() => {
        m.up(db);
        db.prepare("INSERT INTO schema_version (version) VALUES (?)").run(
          m.version,
        );
      });
      trx();
    }
  }
}
