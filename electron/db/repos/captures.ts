import { db, newId } from '../index';
import type { Capture } from '@shared/models';

interface Row {
  id: string;
  text: string;
  tag: string | null;
  created_at: number;
  archived_at: number | null;
}

const map = (r: Row): Capture => ({
  id: r.id,
  text: r.text,
  tag: r.tag,
  createdAt: r.created_at,
  archivedAt: r.archived_at,
});

export const captures = {
  list(limit = 50): Capture[] {
    return (
      db()
        .prepare('SELECT * FROM captures WHERE archived_at IS NULL ORDER BY created_at DESC LIMIT ?')
        .all(limit) as Row[]
    ).map(map);
  },
  create(input: { text: string; tag?: string | null }): Capture {
    const row: Capture = {
      id: newId('cap'),
      text: input.text,
      tag: input.tag ?? null,
      createdAt: Date.now(),
      archivedAt: null,
    };
    db()
      .prepare(
        `INSERT INTO captures (id, text, tag, created_at, archived_at)
         VALUES (@id, @text, @tag, @createdAt, @archivedAt)`
      )
      .run(row);
    return row;
  },
  tag(id: string, tag: string | null): void {
    db().prepare('UPDATE captures SET tag = ? WHERE id = ?').run(tag, id);
  },
  archive(id: string): void {
    db().prepare('UPDATE captures SET archived_at = ? WHERE id = ?').run(Date.now(), id);
  },
  latest(): Capture | null {
    const r = db()
      .prepare('SELECT * FROM captures WHERE archived_at IS NULL ORDER BY created_at DESC LIMIT 1')
      .get() as Row | undefined;
    return r ? map(r) : null;
  },
};
