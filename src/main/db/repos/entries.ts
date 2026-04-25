import type {
  Entry,
  EntryRow,
  EntrySource,
  CurrentTaskView,
} from "@shared/types";
import { db, newId } from "../index";
import { startOfDay } from "../utils";

interface Row {
  id: string;
  task_id: string;
  started_at: number;
  ended_at: number | null;
  source: EntrySource;
  note: string | null;
}

interface JoinedRow extends Row {
  task_title: string;
  ticket: string | null;
  project_id: string;
  project_name: string;
  project_color: string;
  tag: string | null;
}

const map = (r: Row): Entry => ({
  id: r.id,
  taskId: r.task_id,
  startedAt: r.started_at,
  endedAt: r.ended_at,
  source: r.source,
  note: r.note,
});

const mapJoined = (r: JoinedRow): EntryRow => ({
  ...map(r),
  taskTitle: r.task_title,
  ticket: r.ticket,
  projectId: r.project_id,
  projectName: r.project_name,
  projectColor: r.project_color,
  tag: r.tag,
});

export const entries = {
  open(): Entry | null {
    const r = db()
      .prepare(
        "SELECT * FROM entries WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1",
      )
      .get() as Row | undefined;
    return r ? map(r) : null;
  },

  start(input: {
    taskId: string;
    startedAt?: number;
    source?: EntrySource;
    note?: string | null;
  }): Entry {
    const now = Date.now();
    entries.pauseAll(input.startedAt ?? now);
    const row: Entry = {
      id: newId("ent"),
      taskId: input.taskId,
      startedAt: input.startedAt ?? now,
      endedAt: null,
      source: input.source ?? "manual",
      note: input.note ?? null,
    };
    db()
      .prepare(
        `INSERT INTO entries (id, task_id, started_at, ended_at, source, note)
         VALUES (@id, @taskId, @startedAt, @endedAt, @source, @note)`,
      )
      .run(row);
    return row;
  },

  pauseAll(at: number = Date.now()): void {
    db()
      .prepare("UPDATE entries SET ended_at = ? WHERE ended_at IS NULL")
      .run(at);
  },

  pause(): void {
    entries.pauseAll();
  },

  /** Insert a closed entry directly (used by retro fill, idle recovery, manual logs). */
  insert(input: {
    taskId: string;
    startedAt: number;
    endedAt: number;
    source: EntrySource;
    note?: string | null;
  }): Entry {
    const row: Entry = {
      id: newId("ent"),
      taskId: input.taskId,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      source: input.source,
      note: input.note ?? null,
    };
    db()
      .prepare(
        `INSERT INTO entries (id, task_id, started_at, ended_at, source, note)
         VALUES (@id, @taskId, @startedAt, @endedAt, @source, @note)`,
      )
      .run(row);
    return row;
  },

  update(id: string, patch: Partial<Entry>): void {
    const cur = db().prepare("SELECT * FROM entries WHERE id = ?").get(id) as
      | Row
      | undefined;
    if (!cur) return;
    const next: Row = {
      ...cur,
      ...(patch.taskId !== undefined ? { task_id: patch.taskId } : {}),
      ...(patch.startedAt !== undefined ? { started_at: patch.startedAt } : {}),
      ...(patch.endedAt !== undefined ? { ended_at: patch.endedAt } : {}),
      ...(patch.source !== undefined ? { source: patch.source } : {}),
      ...(patch.note !== undefined ? { note: patch.note } : {}),
    };
    db()
      .prepare(
        `UPDATE entries SET task_id=@task_id, started_at=@started_at, ended_at=@ended_at,
         source=@source, note=@note WHERE id=@id`,
      )
      .run(next);
  },

  delete(id: string): void {
    db().prepare("DELETE FROM entries WHERE id = ?").run(id);
  },

  list(
    filter: { from?: number; to?: number; taskId?: string } = {},
  ): EntryRow[] {
    const conditions: string[] = [];
    const params: Record<string, unknown> = {};
    if (filter.from !== undefined) {
      conditions.push("e.started_at >= @from");
      params.from = filter.from;
    }
    if (filter.to !== undefined) {
      conditions.push("e.started_at <= @to");
      params.to = filter.to;
    }
    if (filter.taskId) {
      conditions.push("e.task_id = @taskId");
      params.taskId = filter.taskId;
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const sql = `
      SELECT
        e.*,
        t.title AS task_title,
        t.ticket,
        t.tag,
        p.id    AS project_id,
        p.name  AS project_name,
        p.color AS project_color
      FROM entries e
      JOIN tasks t    ON t.id = e.task_id
      JOIN projects p ON p.id = t.project_id
      ${where}
      ORDER BY e.started_at ASC
    `;
    return (db().prepare(sql).all(params) as JoinedRow[]).map(mapJoined);
  },

  /** Most recently closed (ended) entry across all tasks. */
  lastClosed(): Entry | null {
    const r = db()
      .prepare(
        "SELECT * FROM entries WHERE ended_at IS NOT NULL ORDER BY ended_at DESC LIMIT 1",
      )
      .get() as Row | undefined;
    return r ? map(r) : null;
  },

  /** Synthesize the "currentTask" view from the open entry + day totals. */
  currentView(now: number = Date.now()): CurrentTaskView {
    const open = entries.open();
    if (!open) {
      return {
        taskId: null,
        ticket: null,
        title: "No task running",
        projectName: "",
        projectColor: "#8a8a8a",
        elapsedSec: 0,
        todaySec: secondsLoggedToday(now),
        running: false,
        entryId: null,
        startedAt: null,
      };
    }
    const sql = `
      SELECT t.id, t.title, t.ticket, p.name AS project_name, p.color AS project_color
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = ?
    `;
    const row = db().prepare(sql).get(open.taskId) as
      | {
          id: string;
          title: string;
          ticket: string | null;
          project_name: string;
          project_color: string;
        }
      | undefined;
    const elapsedSec = Math.floor((now - open.startedAt) / 1000);
    return {
      taskId: open.taskId,
      ticket: row?.ticket ?? null,
      title: row?.title ?? "Unknown task",
      projectName: row?.project_name ?? "",
      projectColor: row?.project_color ?? "#8a8a8a",
      elapsedSec,
      todaySec: secondsLoggedToday(now),
      running: true,
      entryId: open.id,
      startedAt: open.startedAt,
    };
  },
};

function secondsLoggedToday(now: number): number {
  const dayStart = startOfDay(now);
  const r = db()
    .prepare(
      `SELECT IFNULL(CAST(SUM(
         (CASE WHEN ended_at IS NULL THEN @now ELSE ended_at END) - started_at
       ) / 1000 AS INTEGER), 0) AS sec
       FROM entries WHERE started_at >= @dayStart`,
    )
    .get({ now, dayStart }) as { sec: number };
  return r?.sec ?? 0;
}
