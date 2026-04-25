import type { Task, TaskWithProject } from "@shared/types";
import { db, newId } from "../index";
import { startOfDay } from "../utils";

interface Row {
  id: string;
  project_id: string;
  ticket: string | null;
  title: string;
  tag: string | null;
  archived_at: number | null;
  created_at: number;
}

interface JoinedRow extends Row {
  project_name: string;
  project_color: string;
  today_sec: number | null;
  active_entry_id: string | null;
}

const map = (r: Row): Task => ({
  id: r.id,
  projectId: r.project_id,
  ticket: r.ticket,
  title: r.title,
  tag: r.tag,
  archivedAt: r.archived_at,
  createdAt: r.created_at,
});

const mapJoined = (r: JoinedRow): TaskWithProject => ({
  ...map(r),
  projectName: r.project_name,
  projectColor: r.project_color,
  todaySec: r.today_sec ?? 0,
  active: !!r.active_entry_id,
});

export const tasks = {
  list(): Task[] {
    return (
      db()
        .prepare(
          "SELECT * FROM tasks WHERE archived_at IS NULL ORDER BY created_at DESC",
        )
        .all() as Row[]
    ).map(map);
  },

  /**
   * Tasks joined with project + today total seconds + whether currently running.
   * `now` defaults to Date.now() but lets tests pin it.
   */
  listWithStats(now = Date.now()): TaskWithProject[] {
    const dayStart = startOfDay(now);
    const sql = `
      SELECT
        t.*,
        p.name  AS project_name,
        p.color AS project_color,
        IFNULL((
          SELECT CAST(SUM(
            (CASE WHEN e.ended_at IS NULL THEN @now ELSE e.ended_at END) - e.started_at
          ) / 1000 AS INTEGER)
          FROM entries e
          WHERE e.task_id = t.id
            AND e.started_at >= @dayStart
        ), 0) AS today_sec,
        (
          SELECT e.id FROM entries e
          WHERE e.task_id = t.id AND e.ended_at IS NULL
          LIMIT 1
        ) AS active_entry_id
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.archived_at IS NULL
      ORDER BY active_entry_id IS NOT NULL DESC, today_sec DESC, t.created_at DESC
    `;
    return (db().prepare(sql).all({ now, dayStart }) as JoinedRow[]).map(
      mapJoined,
    );
  },

  get(id: string): Task | null {
    const r = db().prepare("SELECT * FROM tasks WHERE id = ?").get(id) as
      | Row
      | undefined;
    return r ? map(r) : null;
  },

  create(input: {
    projectId: string;
    title: string;
    ticket?: string | null;
    tag?: string | null;
    id?: string;
  }): Task {
    const id = input.id ?? newId("tsk");
    const now = Date.now();
    const row: Task = {
      id,
      projectId: input.projectId,
      ticket: input.ticket ?? null,
      title: input.title,
      tag: input.tag ?? null,
      archivedAt: null,
      createdAt: now,
    };
    db()
      .prepare(
        `INSERT INTO tasks (id, project_id, ticket, title, tag, archived_at, created_at)
         VALUES (@id, @projectId, @ticket, @title, @tag, @archivedAt, @createdAt)`,
      )
      .run(row);
    return row;
  },

  archive(id: string): void {
    db()
      .prepare("UPDATE tasks SET archived_at = ? WHERE id = ?")
      .run(Date.now(), id);
  },
};
