import type {
  Entry,
  EntryRow,
  EntrySource,
  CurrentTaskView,
} from "@shared/types";
import {
  resolveConflict,
  splitAround,
  type ConflictOutcome,
} from "@shared/lib/timeline";
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
  integration_id: string | null;
  external_url: string | null;
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
  integrationId: r.integration_id,
  externalUrl: r.external_url,
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

  /**
   * Closed entries within a window. Used by overlap detection — keeps the
   * comparison set small (one day on either side of the proposed range
   * unless the range is huge, in which case we widen it).
   */
  closedInRange(from: number, to: number): Entry[] {
    return (
      db()
        .prepare(
          `SELECT * FROM entries
           WHERE ended_at IS NOT NULL
             AND started_at < @to
             AND ended_at > @from`,
        )
        .all({ from, to }) as Row[]
    ).map(map);
  },

  /**
   * Decide whether `proposed` overlaps existing closed entries.
   *   - `kind: "ok"`     no neighbour in the way.
   *   - `kind: "trim"`   overlap touches only an edge; auto-trimming the
   *                      proposed range fits without dropping below the
   *                      minimum duration.
   *   - `kind: "conflict"` proposed range straddles a neighbour entirely
   *                      (or a trim would go below MIN_DURATION_MS).
   */
  proposeRange(input: {
    startedAt: number;
    endedAt: number;
    excludeId?: string;
  }): ConflictOutcome<Entry> {
    const padding = 60 * 60_000; // 1 hour
    const others = entries.closedInRange(
      input.startedAt - padding,
      input.endedAt + padding,
    );
    return resolveConflict(input, others, input.excludeId);
  },

  /**
   * Apply a "split" resolution: trim every overlapping neighbour to the
   * proposed range's boundaries. Returns the number of pieces created.
   * Used when the user picks "Split" in the conflict dialog.
   */
  splitConflicting(input: {
    startedAt: number;
    endedAt: number;
    excludeId?: string;
  }): number {
    const padding = 60 * 60_000;
    const others = entries.closedInRange(
      input.startedAt - padding,
      input.endedAt + padding,
    );
    let pieces = 0;
    for (const o of others) {
      if (input.excludeId && o.id === input.excludeId) continue;
      if (o.endedAt === null) continue;
      const remaining = splitAround(
        { startedAt: o.startedAt, endedAt: o.endedAt },
        input,
      );
      if (
        remaining.length === 1 &&
        remaining[0].startedAt === o.startedAt &&
        remaining[0].endedAt === o.endedAt
      ) {
        // No actual split (proposed didn't actually overlap this row).
        continue;
      }
      // Remove the original; insert each remaining piece.
      entries.delete(o.id);
      for (const piece of remaining) {
        entries.insert({
          taskId: o.taskId,
          startedAt: piece.startedAt,
          endedAt: piece.endedAt,
          source: o.source,
          note: o.note,
        });
        pieces++;
      }
    }
    return pieces;
  },

  /** Replace: delete every overlapping neighbour outright. */
  deleteConflicting(input: {
    startedAt: number;
    endedAt: number;
    excludeId?: string;
  }): number {
    const padding = 60 * 60_000;
    const others = entries.closedInRange(
      input.startedAt - padding,
      input.endedAt + padding,
    );
    let deleted = 0;
    for (const o of others) {
      if (input.excludeId && o.id === input.excludeId) continue;
      const oEnd = o.endedAt ?? Number.POSITIVE_INFINITY;
      if (o.startedAt < input.endedAt && oEnd > input.startedAt) {
        entries.delete(o.id);
        deleted++;
      }
    }
    return deleted;
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
        t.integration_id,
        t.external_url,
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
        integrationId: null,
        externalUrl: null,
      };
    }
    const sql = `
      SELECT t.id, t.title, t.ticket, t.integration_id, t.external_url,
             p.name AS project_name, p.color AS project_color
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = ?
    `;
    const row = db().prepare(sql).get(open.taskId) as
      | {
          id: string;
          title: string;
          ticket: string | null;
          integration_id: string | null;
          external_url: string | null;
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
      integrationId: row?.integration_id ?? null,
      externalUrl: row?.external_url ?? null,
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
