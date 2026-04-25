import { db } from '../index';
import { DEFAULT_SETTINGS, type Settings } from '@shared/models';

interface Row {
  key: string;
  value: string;
}

function readAll(): Settings {
  const rows = db().prepare('SELECT key, value FROM settings').all() as Row[];
  const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    try {
      merged[r.key] = JSON.parse(r.value);
    } catch {
      merged[r.key] = r.value;
    }
  }
  // Ensure nested defaults are present even if a partial row exists
  return { ...DEFAULT_SETTINGS, ...(merged as Partial<Settings>) } as Settings;
}

function writeKey(key: string, value: unknown): void {
  db()
    .prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
    .run(key, JSON.stringify(value));
}

export const settings = {
  getAll(): Settings {
    return readAll();
  },

  patch(patch: Partial<Settings>): Settings {
    const trx = db().transaction((p: Partial<Settings>) => {
      for (const [k, v] of Object.entries(p)) {
        writeKey(k, v);
      }
    });
    trx(patch);
    return readAll();
  },

  reset(): void {
    db().prepare('DELETE FROM settings').run();
  },
};
