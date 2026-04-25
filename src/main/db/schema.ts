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
