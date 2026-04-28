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
  completed_at: number | null;
  created_at: number;
  integration_id: string | null;
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
  completedAt: r.completed_at,
  createdAt: r.created_at,
  integrationId: r.integration_id ?? null,
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
   *
   * Completed tasks sort last so the active list stays focused, but they're
   * still included so the UI can render them with strikethrough.
   */
  listWithStats(now = Date.now()): TaskWithProject[] {
    return tasks.queryWithStats({ now });
  },

  /**
   * Variant of `listWithStats` with optional filters used by the Projects
   * drill-in. `includeArchived` controls whether archived tasks come back;
   * `projectId` narrows the result to a single project. Both default to the
   * normal behaviour (active, all projects).
   *
   * Kept as one query so the renderer never has to do two round-trips for
   * the same data.
   */
  queryWithStats(opts: {
    now?: number;
    projectId?: string;
    includeArchived?: boolean;
  } = {}): TaskWithProject[] {
    const now = opts.now ?? Date.now();
    const dayStart = startOfDay(now);
    const where: string[] = [];
    if (!opts.includeArchived) where.push("t.archived_at IS NULL");
    if (opts.projectId) where.push("t.project_id = @projectId");
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
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY
        t.completed_at IS NOT NULL,
        active_entry_id IS NOT NULL DESC,
        today_sec DESC,
        t.created_at DESC
    `;
    return (
      db().prepare(sql).all({
        now,
        dayStart,
        projectId: opts.projectId ?? null,
      }) as JoinedRow[]
    ).map(mapJoined);
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
    integrationId?: string | null;
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
      completedAt: null,
      createdAt: now,
      integrationId: input.integrationId ?? null,
    };
    db()
      .prepare(
        `INSERT INTO tasks (id, project_id, ticket, title, tag, archived_at, completed_at, created_at, integration_id)
         VALUES (@id, @projectId, @ticket, @title, @tag, @archivedAt, @completedAt, @createdAt, @integrationId)`,
      )
      .run(row);
    return row;
  },

  /**
   * Patch user-editable fields. Title is required to be a non-empty string;
   * pass undefined for any field you don't want to touch. Returns the updated
   * row, or null if it didn't exist.
   */
  update(
    id: string,
    patch: Partial<
      Pick<Task, "title" | "ticket" | "tag" | "projectId">
    >,
  ): Task | null {
    const cur = tasks.get(id);
    if (!cur) return null;
    const next: Task = {
      ...cur,
      title: patch.title !== undefined ? patch.title : cur.title,
      ticket: patch.ticket !== undefined ? patch.ticket : cur.ticket,
      tag: patch.tag !== undefined ? patch.tag : cur.tag,
      projectId: patch.projectId !== undefined ? patch.projectId : cur.projectId,
    };
    db()
      .prepare(
        `UPDATE tasks
         SET project_id = @projectId, ticket = @ticket, title = @title, tag = @tag
         WHERE id = @id`,
      )
      .run(next);
    return next;
  },

  archive(id: string): void {
    db()
      .prepare("UPDATE tasks SET archived_at = ? WHERE id = ?")
      .run(Date.now(), id);
  },

  /** Restore an archived task. */
  unarchive(id: string): void {
    db().prepare("UPDATE tasks SET archived_at = NULL WHERE id = ?").run(id);
  },

  /** Mark a task as complete (or reopen it). Completion is reversible. */
  setCompleted(id: string, completed: boolean): void {
    db()
      .prepare("UPDATE tasks SET completed_at = ? WHERE id = ?")
      .run(completed ? Date.now() : null, id);
  },
};
