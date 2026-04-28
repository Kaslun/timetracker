import { entries, tasks, projects } from "../db/repos";
import { register } from "./handlers";
import { broadcastChanges } from "./broadcast";
import { startOfDay } from "../db/utils";
import { db } from "../db";

export function registerTimer(): void {
  register("task:start", ({ taskId }) => {
    entries.start({ taskId });
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
    entries.start({ taskId });
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
    const ticket = safePatch.ticket !== undefined ? safePatch.ticket : cur.ticket;
    if (ticket && ticket.trim()) {
      const conflict = tasks
        .list()
        .find(
          (t) => t.id !== id && t.projectId === projectId && t.ticket === ticket,
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
  register("entry:update", ({ id, patch }) => {
    entries.update(id, patch);
    broadcastChanges({ current: true, tasks: true, entries: true });
  });
  register("entry:delete", ({ id }) => {
    entries.delete(id);
    broadcastChanges({ current: true, tasks: true, entries: true });
  });
  register("entry:insert", (input) => {
    const e = entries.insert(input);
    broadcastChanges({ tasks: true, entries: true });
    return e;
  });

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
    const days =
      range === "week" ? 7 : range === "month" ? 30 : 90; // "all" capped to 90 days for the chart.
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
