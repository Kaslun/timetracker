import type { Project, ProjectStats } from "@shared/types";
import { db, newId } from "../index";
import { startOfDay } from "../utils";

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
    return (
      db()
        .prepare(
          "SELECT * FROM projects ORDER BY archived_at IS NULL DESC, name",
        )
        .all() as Row[]
    ).map(map);
  },
  get(id: string): Project | null {
    const r = db().prepare("SELECT * FROM projects WHERE id = ?").get(id) as
      | Row
      | undefined;
    return r ? map(r) : null;
  },
  create(p: Project | Omit<Project, "id"> & { id?: string }): Project {
    const next: Project = {
      ...p,
      id: p.id ?? newId("prj"),
    };
    db()
      .prepare(
        `INSERT INTO projects (id, name, color, ticket_prefix, integration_id, archived_at)
         VALUES (@id, @name, @color, @ticketPrefix, @integrationId, @archivedAt)`,
      )
      .run(next);
    return next;
  },
  update(id: string, patch: Partial<Project>): Project | null {
    const cur = projects.get(id);
    if (!cur) return null;
    const next: Project = { ...cur, ...patch };
    db()
      .prepare(
        `UPDATE projects
         SET name = @name, color = @color, ticket_prefix = @ticketPrefix,
             integration_id = @integrationId, archived_at = @archivedAt
         WHERE id = @id`,
      )
      .run(next);
    return next;
  },

  /**
   * Archive the project plus every task it owns. Time entries stay (the user
   * may still want to look at them in the dashboard); only the visibility of
   * the row in active lists changes.
   */
  archive(id: string): void {
    const now = Date.now();
    const trx = db().transaction(() => {
      db()
        .prepare("UPDATE projects SET archived_at = ? WHERE id = ?")
        .run(now, id);
      db()
        .prepare(
          "UPDATE tasks SET archived_at = ? WHERE project_id = ? AND archived_at IS NULL",
        )
        .run(now, id);
    });
    trx();
  },

  /**
   * Restore an archived project. Tasks archived as part of the original
   * archive call are *not* automatically restored — the user can pick which
   * ones to reopen from the project drill-in.
   */
  unarchive(id: string): void {
    db().prepare("UPDATE projects SET archived_at = NULL WHERE id = ?").run(id);
  },

  /**
   * Per-project totals used by the Projects tab list. Computed in one query
   * per range so the renderer doesn't have to splatter sub-queries.
   *
   * `range` controls which entries' time gets summed:
   *   - `"week"`: the past 7 days from `now`.
   *   - `"month"`: the past 30 days from `now`.
   *   - `"all"`: every entry ever.
   */
  stats(
    range: "week" | "month" | "all",
    now = Date.now(),
  ): ProjectStats[] {
    const since =
      range === "all"
        ? 0
        : range === "week"
          ? startOfDay(now) - 6 * 24 * 60 * 60_000
          : startOfDay(now) - 29 * 24 * 60 * 60_000;
    const sql = `
      SELECT
        p.id AS id,
        COUNT(t.id) AS total_tasks,
        SUM(CASE WHEN t.archived_at IS NULL AND t.completed_at IS NULL THEN 1 ELSE 0 END) AS open_tasks,
        IFNULL((
          SELECT CAST(SUM(
            (CASE WHEN e.ended_at IS NULL THEN @now ELSE e.ended_at END) - e.started_at
          ) / 1000 AS INTEGER)
          FROM entries e
          JOIN tasks t2 ON t2.id = e.task_id
          WHERE t2.project_id = p.id AND e.started_at >= @since
        ), 0) AS tracked_sec
      FROM projects p
      LEFT JOIN tasks t ON t.project_id = p.id
      GROUP BY p.id
    `;
    const rows = db().prepare(sql).all({ now, since }) as Array<{
      id: string;
      total_tasks: number;
      open_tasks: number | null;
      tracked_sec: number;
    }>;
    return rows.map((r) => ({
      projectId: r.id,
      totalTasks: r.total_tasks,
      openTasks: r.open_tasks ?? 0,
      trackedSec: r.tracked_sec,
    }));
  },
};
