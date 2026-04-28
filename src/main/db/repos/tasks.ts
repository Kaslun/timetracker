import type { Task, TaskPriority, TaskWithProject } from "@shared/types";
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
  updated_at: number | null;
  integration_id: string | null;
  priority: TaskPriority | null;
  external_url: string | null;
}

interface JoinedRow extends Row {
  project_name: string;
  project_color: string;
  today_sec: number | null;
  total_sec: number | null;
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
  updatedAt: r.updated_at ?? r.created_at,
  integrationId: r.integration_id ?? null,
  priority: (r.priority ?? "none") as TaskPriority,
  externalUrl: r.external_url ?? null,
});

const mapJoined = (r: JoinedRow): TaskWithProject => ({
  ...map(r),
  projectName: r.project_name,
  projectColor: r.project_color,
  todaySec: r.today_sec ?? 0,
  totalSec: r.total_sec ?? 0,
  active: !!r.active_entry_id,
});

/** Numeric weight for SQL ORDER BY. Mirrors PRIORITY_WEIGHT in shared/types. */
const PRIORITY_RANK_SQL = `
  CASE t.priority
    WHEN 'urgent' THEN 4
    WHEN 'high'   THEN 3
    WHEN 'medium' THEN 2
    WHEN 'low'    THEN 1
    ELSE 0
  END
`;

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
    return tasks.queryWithStats({ now });
  },

  /**
   * Variant of `listWithStats` with optional filters. Used by the Projects
   * drill-in (`projectId` / `includeArchived`) and indirectly by the Tasks tab
   * (filters there are applied client-side from the same payload).
   *
   * The default sort surfaces still-active rows first, then completed last —
   * the Tasks tab re-sorts client-side when the user picks a different mode.
   */
  queryWithStats(
    opts: {
      now?: number;
      projectId?: string;
      includeArchived?: boolean;
    } = {},
  ): TaskWithProject[] {
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
        IFNULL((
          SELECT CAST(SUM(
            (CASE WHEN e.ended_at IS NULL THEN @now ELSE e.ended_at END) - e.started_at
          ) / 1000 AS INTEGER)
          FROM entries e
          WHERE e.task_id = t.id
        ), 0) AS total_sec,
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
        ${PRIORITY_RANK_SQL} DESC,
        today_sec DESC,
        t.updated_at DESC,
        t.created_at DESC
    `;
    return (
      db()
        .prepare(sql)
        .all({
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

  /** Look up a task by its provider + remote URL. Used by sync to upsert. */
  getByExternalUrl(provider: string, url: string): Task | null {
    const r = db()
      .prepare(
        "SELECT * FROM tasks WHERE integration_id = ? AND external_url = ? LIMIT 1",
      )
      .get(provider, url) as Row | undefined;
    return r ? map(r) : null;
  },

  /** Distinct `tag` values across the active task set (for the filter chip). */
  distinctTags(): string[] {
    return (
      db()
        .prepare(
          "SELECT DISTINCT tag FROM tasks WHERE archived_at IS NULL AND tag IS NOT NULL AND tag != '' ORDER BY tag ASC",
        )
        .all() as { tag: string }[]
    ).map((r) => r.tag);
  },

  create(input: {
    projectId: string;
    title: string;
    ticket?: string | null;
    tag?: string | null;
    id?: string;
    integrationId?: string | null;
    priority?: TaskPriority;
    externalUrl?: string | null;
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
      updatedAt: now,
      integrationId: input.integrationId ?? null,
      priority: input.priority ?? "none",
      externalUrl: input.externalUrl ?? null,
    };
    db()
      .prepare(
        `INSERT INTO tasks (id, project_id, ticket, title, tag, archived_at, completed_at, created_at, updated_at, integration_id, priority, external_url)
         VALUES (@id, @projectId, @ticket, @title, @tag, @archivedAt, @completedAt, @createdAt, @updatedAt, @integrationId, @priority, @externalUrl)`,
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
      Pick<Task, "title" | "ticket" | "tag" | "projectId" | "priority">
    >,
  ): Task | null {
    const cur = tasks.get(id);
    if (!cur) return null;
    const next: Task = {
      ...cur,
      title: patch.title !== undefined ? patch.title : cur.title,
      ticket: patch.ticket !== undefined ? patch.ticket : cur.ticket,
      tag: patch.tag !== undefined ? patch.tag : cur.tag,
      projectId:
        patch.projectId !== undefined ? patch.projectId : cur.projectId,
      priority: patch.priority !== undefined ? patch.priority : cur.priority,
      updatedAt: Date.now(),
    };
    db()
      .prepare(
        `UPDATE tasks
         SET project_id = @projectId, ticket = @ticket, title = @title, tag = @tag,
             priority = @priority, updated_at = @updatedAt
         WHERE id = @id`,
      )
      .run(next);
    return next;
  },

  archive(id: string): void {
    const now = Date.now();
    db()
      .prepare("UPDATE tasks SET archived_at = ?, updated_at = ? WHERE id = ?")
      .run(now, now, id);
  },

  /** Restore an archived task. */
  unarchive(id: string): void {
    const now = Date.now();
    db()
      .prepare(
        "UPDATE tasks SET archived_at = NULL, updated_at = ? WHERE id = ?",
      )
      .run(now, id);
  },

  /** Mark a task as complete (or reopen it). Completion is reversible. */
  setCompleted(id: string, completed: boolean): void {
    const now = Date.now();
    db()
      .prepare("UPDATE tasks SET completed_at = ?, updated_at = ? WHERE id = ?")
      .run(completed ? now : null, now, id);
  },
};
