import type { ConflictOutcome } from "@shared/lib/timeline";
import type { Entry, EntryRow } from "@shared/types";
import { entries, tasks, projects } from "../db/repos";
import { startOfDay } from "../db/utils";
import { db } from "../db";
import { register } from "./handlers";
import { broadcastChanges } from "./broadcast";

type Resolution = "auto" | "replace" | "split" | "force";

/**
 * If `now` falls inside a manually-logged closed entry, push the new
 * timer's start to the end of that block so we don't silently overlap.
 * The task is still "running"; it just begins from the boundary forward.
 * Renderer can prompt for replace/split via `entry:proposeRange` before
 * calling start if it wants the explicit dialog.
 */
function pickNonOverlappingStart(now: number): number {
  const recent = entries.closedInRange(now - 24 * 60 * 60_000, now + 1);
  for (const e of recent) {
    if (e.endedAt === null) continue;
    if (e.startedAt <= now && e.endedAt > now) {
      return e.endedAt;
    }
  }
  return now;
}

/**
 * Apply the chosen overlap-resolution before writing an entry to the DB.
 * Returns the (possibly trimmed) range to actually persist.
 *
 *   - `auto`    trim if it fits, otherwise throw "OVERLAP_CONFLICT".
 *   - `replace` delete every overlapping neighbour, write as proposed.
 *   - `split`   trim every overlapping neighbour around the proposed range.
 *   - `force`   bypass overlap rules entirely (used by Tempo round-trip /
 *               legacy import paths). Avoid in normal UI flows.
 */
function applyResolution(args: {
  startedAt: number;
  endedAt: number;
  excludeId?: string;
  resolution: Resolution;
}): { startedAt: number; endedAt: number } {
  const { startedAt, endedAt, excludeId, resolution } = args;
  if (resolution === "force") return { startedAt, endedAt };
  const outcome = entries.proposeRange({ startedAt, endedAt, excludeId });
  if (outcome.kind === "ok") return { startedAt, endedAt };
  if (outcome.kind === "trim") {
    return outcome.adjusted;
  }
  if (resolution === "replace") {
    entries.deleteConflicting({ startedAt, endedAt, excludeId });
    return { startedAt, endedAt };
  }
  if (resolution === "split") {
    entries.splitConflicting({ startedAt, endedAt, excludeId });
    return { startedAt, endedAt };
  }
  throw new Error("OVERLAP_CONFLICT");
}

/**
 * Hydrate the bare `Entry` rows in a `conflict` outcome into joined
 * `EntryRow` shapes (with task title, project, etc.) so the renderer can
 * render the conflict dialog without a follow-up round trip.
 */
function enrichConflicts(
  outcome: ConflictOutcome<Entry>,
): ConflictOutcome<EntryRow> {
  if (outcome.kind !== "conflict") return outcome;
  const ids = new Set(outcome.conflictsWith.map((c) => c.id));
  if (ids.size === 0) return { kind: "conflict", conflictsWith: [] };
  const all = entries.list({});
  const enriched = all.filter((e) => ids.has(e.id));
  return { kind: "conflict", conflictsWith: enriched };
}

export function registerTimer(): void {
  register("task:start", ({ taskId }) => {
    const now = Date.now();
    const startedAt = pickNonOverlappingStart(now);
    entries.start({ taskId, startedAt });
    broadcastChanges({ current: true, tasks: true, entries: true });
    return entries.currentView();
  });

  register("task:pause", () => {
    entries.pause();
    broadcastChanges({ current: true, tasks: true, entries: true });
    return entries.currentView();
  });

  register("task:toggle", () => {
    const cur = entries.open();
    if (cur) entries.pause();
    else {
      // Resume the most-touched task today (or the first task if none).
      const list = tasks.listWithStats();
      const target = list.find((t) => t.todaySec > 0) ?? list[0];
      if (target) entries.start({ taskId: target.id });
    }
    broadcastChanges({ current: true, tasks: true, entries: true });
    return entries.currentView();
  });

  register("task:switch", ({ taskId }) => {
    const now = Date.now();
    const startedAt = pickNonOverlappingStart(now);
    entries.start({ taskId, startedAt });
    broadcastChanges({ current: true, tasks: true, entries: true });
    return entries.currentView();
  });

  register("task:current", () => entries.currentView());
  register("task:list", () => tasks.listWithStats());

  register("task:create", (input) => {
    const created = tasks.create(input);
    broadcastChanges({ tasks: true });
    return created;
  });
  register("task:archive", ({ id }) => {
    tasks.archive(id);
    broadcastChanges({ tasks: true, entries: true });
  });
  register("task:unarchive", ({ id }) => {
    tasks.unarchive(id);
    broadcastChanges({ tasks: true });
  });
  register("task:update", ({ id, patch }) => {
    const cur = tasks.get(id);
    if (!cur) {
      throw new Error(`task ${id} not found`);
    }
    // Strip source-owned fields for integration-imported tasks. The renderer
    // also disables those inputs but defence in depth — keep the source the
    // source-of-truth.
    const safePatch: typeof patch = { ...patch };
    if (cur.integrationId) {
      delete safePatch.title;
      delete safePatch.ticket;
    }
    if (safePatch.title !== undefined && safePatch.title.trim() === "") {
      throw new Error("Title cannot be empty");
    }
    const projectId = safePatch.projectId ?? cur.projectId;
    const ticket =
      safePatch.ticket !== undefined ? safePatch.ticket : cur.ticket;
    if (ticket && ticket.trim()) {
      const conflict = tasks
        .list()
        .find(
          (t) =>
            t.id !== id && t.projectId === projectId && t.ticket === ticket,
        );
      if (conflict) {
        throw new Error(
          `Ticket key "${ticket}" is already used by another task in this project.`,
        );
      }
    }
    const next = tasks.update(id, {
      ...safePatch,
      title: safePatch.title?.trim(),
    });
    broadcastChanges({ tasks: true, current: true, entries: true });
    if (!next) throw new Error(`task ${id} disappeared mid-update`);
    return next;
  });
  register("task:setCompleted", ({ id, completed }) => {
    // If we're completing the currently-running task, pause the timer first
    // so it doesn't keep accruing time on a "done" task.
    if (completed) {
      const cur = entries.open();
      if (cur && cur.taskId === id) entries.pause();
    }
    tasks.setCompleted(id, completed);
    broadcastChanges({ current: true, tasks: true, entries: true });
  });

  register("entry:list", (input) => entries.list(input));
  register("entry:update", ({ id, patch, resolution }) => {
    // If start/end is being patched, run conflict resolution against the
    // proposed bounds (excluding this entry from the comparison set).
    const cur = entries.list({}).find((e) => e.id === id);
    const startedAt = patch.startedAt ?? cur?.startedAt;
    const endedAt = patch.endedAt ?? cur?.endedAt ?? null;
    if (startedAt && endedAt) {
      applyResolution({
        startedAt,
        endedAt,
        excludeId: id,
        resolution: resolution ?? "auto",
      });
    }
    entries.update(id, patch);
    broadcastChanges({ current: true, tasks: true, entries: true });
  });
  register("entry:delete", ({ id }) => {
    entries.delete(id);
    broadcastChanges({ current: true, tasks: true, entries: true });
  });
  register("entry:insert", (input) => {
    const adjusted = applyResolution({
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      resolution: input.resolution ?? "auto",
    });
    const e = entries.insert({
      taskId: input.taskId,
      startedAt: adjusted.startedAt,
      endedAt: adjusted.endedAt,
      source: input.source,
      note: input.note,
    });
    broadcastChanges({ tasks: true, entries: true });
    return e;
  });
  register("entry:proposeRange", (input) =>
    enrichConflicts(
      entries.proposeRange({
        startedAt: input.startedAt,
        endedAt: input.endedAt,
        excludeId: input.excludeId,
      }),
    ),
  );

  register("task:distinctTags", () => tasks.distinctTags());

  register("project:list", () => projects.list());
  register("project:stats", (input) => projects.stats(input?.range ?? "week"));
  register("project:create", ({ name, color, ticketPrefix }) => {
    const created = projects.create({
      name,
      color,
      ticketPrefix: ticketPrefix ?? null,
      integrationId: null,
      archivedAt: null,
    });
    broadcastChanges({ tasks: true });
    return created;
  });
  register("project:update", ({ id, patch }) => {
    const next = projects.update(id, patch);
    if (!next) throw new Error(`project ${id} not found`);
    broadcastChanges({ tasks: true });
    return next;
  });
  register("project:archive", ({ id }) => {
    projects.archive(id);
    broadcastChanges({ tasks: true });
  });
  register("project:unarchive", ({ id }) => {
    projects.unarchive(id);
    broadcastChanges({ tasks: true });
  });
  register("project:tasks", ({ projectId, includeArchived }) =>
    tasks.queryWithStats({
      projectId,
      includeArchived: includeArchived ?? false,
    }),
  );
  register("project:dailyBreakdown", ({ projectId, range }) => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60_000;
    const days = range === "week" ? 7 : range === "month" ? 30 : 90; // "all" capped to 90 days for the chart.
    const since = startOfDay(now) - (days - 1) * dayMs;
    const rows = db()
      .prepare(
        `SELECT e.started_at, e.ended_at FROM entries e
         JOIN tasks t ON t.id = e.task_id
         WHERE t.project_id = ? AND e.started_at >= ?`,
      )
      .all(projectId, since) as Array<{
      started_at: number;
      ended_at: number | null;
    }>;
    const buckets = new Map<string, number>();
    for (let i = 0; i < days; i += 1) {
      const d = new Date(since + i * dayMs);
      buckets.set(isoDate(d), 0);
    }
    for (const r of rows) {
      const start = r.started_at;
      const end = r.ended_at ?? now;
      const key = isoDate(new Date(start));
      const cur = buckets.get(key) ?? 0;
      buckets.set(key, cur + (end - start) / 1000);
    }
    return [...buckets.entries()].map(([date, seconds]) => ({
      date,
      seconds: Math.round(seconds),
    }));
  });
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
