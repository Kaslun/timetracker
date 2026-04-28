/**
 * Pure filter + sort + suggestion helpers for the Tasks tab and the task
 * picker. Lives in shared/ so the renderer (live filtering) and tests run
 * without dragging in any DOM or store.
 *
 * Selection contract:
 *   - `applyTaskFilters` is the canonical filter function. The Tasks tab
 *     calls it with the user's `TaskFilters`; the task picker calls it
 *     with a default filter (no project/source/tag chips active).
 *   - `sortBySuggestion` is the picker's secondary order: pinned-running,
 *     then urgent/high in the last 7 days, then recently tracked, then
 *     everything else. The picker passes the active task id so it can be
 *     pinned regardless of how it'd otherwise sort.
 */
import { PRIORITY_WEIGHT, type TaskPriority } from "../types";
import type { TaskFilters, TaskWithProject } from "../types";
import { taskSource } from "../integrations/registry";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Apply every chip + the search query in `TaskFilters`. Returns a *new*
 * array; the original input is untouched.
 */
export function applyTaskFilters(
  tasks: readonly TaskWithProject[],
  filters: TaskFilters,
): TaskWithProject[] {
  const q = filters.query.trim().toLowerCase();
  const projects = new Set(filters.projectIds);
  const sources = new Set(filters.sources);
  const tags = new Set(filters.tags);
  const priorities = new Set(filters.priorities);

  return tasks.filter((t) => {
    if (q) {
      const haystack = [
        t.title.toLowerCase(),
        t.projectName.toLowerCase(),
        t.ticket?.toLowerCase() ?? "",
      ];
      if (!haystack.some((s) => s.includes(q))) return false;
    }

    if (filters.status === "active" && t.archivedAt !== null) return false;
    if (filters.status === "archived" && t.archivedAt === null) return false;

    if (projects.size > 0 && !projects.has(t.projectId)) return false;
    if (sources.size > 0) {
      if (!sources.has(taskSource(t.integrationId))) return false;
    }
    if (tags.size > 0) {
      if (!t.tag || !tags.has(t.tag)) return false;
    }
    if (priorities.size > 0 && !priorities.has(t.priority)) return false;

    return true;
  });
}

/**
 * Sort tasks for display in the Tasks tab. Stable across re-renders: ties
 * fall back to `updatedAt` then `id`.
 */
export function sortTasks(
  tasks: readonly TaskWithProject[],
  sort: TaskFilters["sort"],
  now: number = Date.now(),
): TaskWithProject[] {
  if (sort === "suggested") {
    // Picker-friendly order; defined separately because it has its own
    // multi-bucket logic that doesn't reduce to a single comparator.
    return sortBySuggestion(tasks, now);
  }
  const arr = [...tasks];
  switch (sort) {
    case "priority":
      arr.sort(
        (a, b) =>
          PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] ||
          b.updatedAt - a.updatedAt ||
          a.id.localeCompare(b.id),
      );
      break;
    case "tracked":
      arr.sort(
        (a, b) =>
          b.totalSec - a.totalSec ||
          b.updatedAt - a.updatedAt ||
          a.id.localeCompare(b.id),
      );
      break;
    case "alpha":
      arr.sort(
        (a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id),
      );
      break;
    case "created":
      arr.sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id));
      break;
    case "updated":
    default:
      arr.sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id));
      break;
  }
  return arr;
}

/**
 * Picker suggestion order:
 *   1. Currently running task (always pinned at top).
 *   2. Urgent/High priority updated in the last 7 days.
 *   3. Recently tracked (any non-zero `totalSec`, ordered by `updatedAt`).
 *   4. Everything else by recency.
 *
 * `now` is injected so the test suite can pin the clock.
 */
export function sortBySuggestion(
  tasks: readonly TaskWithProject[],
  now: number = Date.now(),
): TaskWithProject[] {
  const cutoff = now - SEVEN_DAYS_MS;
  return [...tasks].sort((a, b) => {
    const ar = bucket(a, cutoff);
    const br = bucket(b, cutoff);
    if (ar !== br) return ar - br;
    // Secondary: priority weight (higher first).
    const ap = PRIORITY_WEIGHT[a.priority];
    const bp = PRIORITY_WEIGHT[b.priority];
    if (ap !== bp) return bp - ap;
    // Tertiary: recency.
    return b.updatedAt - a.updatedAt;
  });
}

function bucket(t: TaskWithProject, cutoff: number): number {
  if (t.active) return 0;
  if (
    (t.priority === "urgent" || t.priority === "high") &&
    t.updatedAt >= cutoff
  ) {
    return 1;
  }
  if (t.totalSec > 0) return 2;
  return 3;
}

/**
 * Pick the single task to spotlight as "today's top priority" in the
 * morning nudge. Highest non-zero priority bucket, breaking ties on the
 * most-recently-updated. Returns null if every task is `none` priority.
 */
export function topPriorityForToday(
  tasks: readonly TaskWithProject[],
): TaskWithProject | null {
  const eligible = tasks.filter(
    (t) =>
      t.archivedAt === null &&
      t.completedAt === null &&
      (t.priority === "urgent" || t.priority === "high"),
  );
  if (eligible.length === 0) return null;
  eligible.sort(
    (a, b) =>
      PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] ||
      b.updatedAt - a.updatedAt,
  );
  return eligible[0];
}

/**
 * Quick "are there any active filters" check. Used to show / hide the
 * "Clear filters" link in the control bar.
 */
export function hasActiveFilters(filters: TaskFilters): boolean {
  return (
    filters.query.trim() !== "" ||
    filters.projectIds.length > 0 ||
    filters.sources.length > 0 ||
    filters.tags.length > 0 ||
    filters.priorities.length > 0 ||
    filters.status !== "active"
  );
}

/** Friendly label for each `TaskPriority` level. */
export function priorityLabel(p: TaskPriority): string {
  switch (p) {
    case "urgent":
      return "Urgent";
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
    case "none":
      return "None";
  }
}

/**
 * Tag colour for a priority chip. Chosen to read well over both light and
 * dark themed backgrounds via `color-mix`. Centralised so chips elsewhere
 * (TaskRow, picker) match.
 */
export function priorityColor(p: TaskPriority): string {
  switch (p) {
    case "urgent":
      return "#ef4444";
    case "high":
      return "#f59e42";
    case "medium":
      return "#0ea5e9";
    case "low":
      return "#84cc16";
    case "none":
      return "#9aa0a6";
  }
}
