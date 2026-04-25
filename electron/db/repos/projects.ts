import { db } from '../index';
import type { Project } from '@shared/models';

interface Row {
  id: string;
  name: string;
  color: string;
  ticket_prefix: string | null;
  integration_id: string | null;
  archived_at: number | null;
}

const map = (r: Row): Project => ({
  id: r.id,
  name: r.name,
  color: r.color,
  ticketPrefix: r.ticket_prefix,
  integrationId: r.integration_id,
  archivedAt: r.archived_at,
});

export const projects = {
  list(): Project[] {
    return (db().prepare('SELECT * FROM projects ORDER BY archived_at IS NULL DESC, name').all() as Row[]).map(map);
  },
  get(id: string): Project | null {
    const r = db().prepare('SELECT * FROM projects WHERE id = ?').get(id) as Row | undefined;
    return r ? map(r) : null;
  },
  create(p: Project): Project {
    db()
      .prepare(
        `INSERT INTO projects (id, name, color, ticket_prefix, integration_id, archived_at)
         VALUES (@id, @name, @color, @ticketPrefix, @integrationId, @archivedAt)`
      )
      .run(p);
    return p;
  },
  update(id: string, patch: Partial<Project>): void {
    const cur = projects.get(id);
    if (!cur) return;
    const next = { ...cur, ...patch };
    db()
      .prepare(
        `UPDATE projects
         SET name = @name, color = @color, ticket_prefix = @ticketPrefix,
             integration_id = @integrationId, archived_at = @archivedAt
         WHERE id = @id`
      )
      .run(next);
  },
};
