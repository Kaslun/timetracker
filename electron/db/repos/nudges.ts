import { db } from '../index';
import type { NudgeRow } from '@shared/models';

interface Row {
  kind: string;
  last_shown_at: number | null;
  last_dismissed_at: number | null;
  payload: string | null;
}

export const nudges = {
  get(kind: string): NudgeRow | null {
    const r = db().prepare('SELECT * FROM nudges WHERE kind = ?').get(kind) as Row | undefined;
    if (!r) return null;
    return {
      kind: r.kind,
      lastShownAt: r.last_shown_at,
      lastDismissedAt: r.last_dismissed_at,
    };
  },
  shown(kind: string, payload?: unknown): void {
    db()
      .prepare(
        `INSERT INTO nudges (kind, last_shown_at, last_dismissed_at, payload)
         VALUES (?, ?, NULL, ?)
         ON CONFLICT(kind) DO UPDATE SET last_shown_at = excluded.last_shown_at, payload = excluded.payload`
      )
      .run(kind, Date.now(), payload != null ? JSON.stringify(payload) : null);
  },
  dismissed(kind: string): void {
    db()
      .prepare(
        `INSERT INTO nudges (kind, last_shown_at, last_dismissed_at)
         VALUES (?, NULL, ?)
         ON CONFLICT(kind) DO UPDATE SET last_dismissed_at = excluded.last_dismissed_at`
      )
      .run(kind, Date.now());
  },
};
