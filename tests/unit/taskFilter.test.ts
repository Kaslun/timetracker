/**
 * Tests for the shared task filter / sort / suggestion library used by the
 * Tasks tab and the picker.
 */
import { describe, expect, it } from "vitest";
import {
  applyTaskFilters,
  hasActiveFilters,
  priorityColor,
  priorityLabel,
  sortBySuggestion,
  sortTasks,
  topPriorityForToday,
} from "@shared/lib/taskFilter";
import { DEFAULT_TASK_FILTERS } from "@shared/constants";
import type { TaskFilters, TaskPriority, TaskWithProject } from "@shared/types";

const NOW = 1_700_000_000_000;

function task(overrides: Partial<TaskWithProject> = {}): TaskWithProject {
  return {
    id: overrides.id ?? "t1",
    projectId: overrides.projectId ?? "p1",
    ticket: overrides.ticket ?? null,
    title: overrides.title ?? "Untitled",
    tag: overrides.tag ?? null,
    archivedAt: overrides.archivedAt ?? null,
    completedAt: overrides.completedAt ?? null,
    createdAt: overrides.createdAt ?? NOW - 86_400_000,
    updatedAt: overrides.updatedAt ?? NOW - 60_000,
    integrationId: overrides.integrationId ?? null,
    priority: overrides.priority ?? "none",
    externalUrl: overrides.externalUrl ?? null,
    projectName: overrides.projectName ?? "Project A",
    projectColor: overrides.projectColor ?? "#666",
    todaySec: overrides.todaySec ?? 0,
    totalSec: overrides.totalSec ?? 0,
    active: overrides.active ?? false,
  };
}

describe("applyTaskFilters", () => {
  const t1 = task({ id: "t1", title: "Fix login bug", priority: "urgent" });
  const t2 = task({
    id: "t2",
    title: "Refactor router",
    priority: "low",
    integrationId: "linear",
  });
  const t3 = task({
    id: "t3",
    title: "Email Bob",
    archivedAt: NOW - 1000,
    tag: "ops",
  });

  it("returns all tasks when filters are empty", () => {
    const out = applyTaskFilters([t1, t2, t3], {
      ...DEFAULT_TASK_FILTERS,
      status: "all",
    });
    expect(out).toHaveLength(3);
  });

  it("excludes archived tasks under the default 'active' status", () => {
    const out = applyTaskFilters([t1, t2, t3], DEFAULT_TASK_FILTERS);
    expect(out.map((t) => t.id)).toEqual(["t1", "t2"]);
  });

  it("includes only archived under status='archived'", () => {
    const out = applyTaskFilters([t1, t2, t3], {
      ...DEFAULT_TASK_FILTERS,
      status: "archived",
    });
    expect(out.map((t) => t.id)).toEqual(["t3"]);
  });

  it("matches search query case-insensitively across title and ticket", () => {
    const t4 = task({ id: "t4", title: "Plain", ticket: "PROJ-42" });
    const out = applyTaskFilters([t1, t4], {
      ...DEFAULT_TASK_FILTERS,
      query: "proj-4",
    });
    expect(out.map((t) => t.id)).toEqual(["t4"]);
  });

  it("filters by source token", () => {
    const out = applyTaskFilters([t1, t2], {
      ...DEFAULT_TASK_FILTERS,
      sources: ["linear"],
    });
    expect(out.map((t) => t.id)).toEqual(["t2"]);
  });

  it("filters by priority", () => {
    const out = applyTaskFilters([t1, t2], {
      ...DEFAULT_TASK_FILTERS,
      priorities: ["urgent"],
    });
    expect(out.map((t) => t.id)).toEqual(["t1"]);
  });

  it("filters by tag and excludes tasks without one", () => {
    const tagged = task({ id: "tagged", tag: "ops" });
    const untagged = task({ id: "untagged", tag: null });
    const out = applyTaskFilters([tagged, untagged], {
      ...DEFAULT_TASK_FILTERS,
      tags: ["ops"],
    });
    expect(out.map((t) => t.id)).toEqual(["tagged"]);
  });

  it("filters by project id", () => {
    const a = task({ id: "a", projectId: "p1" });
    const b = task({ id: "b", projectId: "p2" });
    const out = applyTaskFilters([a, b], {
      ...DEFAULT_TASK_FILTERS,
      projectIds: ["p2"],
    });
    expect(out.map((t) => t.id)).toEqual(["b"]);
  });

  it("status='all' keeps both archived and active", () => {
    const out = applyTaskFilters([t1, t2, t3], {
      ...DEFAULT_TASK_FILTERS,
      status: "all",
    });
    expect(out).toHaveLength(3);
  });
});

describe("sortTasks", () => {
  const a = task({ id: "a", priority: "low", updatedAt: NOW - 5000 });
  const b = task({ id: "b", priority: "urgent", updatedAt: NOW - 9000 });
  const c = task({
    id: "c",
    priority: "medium",
    updatedAt: NOW - 1000,
    totalSec: 9999,
  });

  it("sort=priority orders urgent first", () => {
    const out = sortTasks([a, b, c], "priority");
    expect(out[0].id).toBe("b");
  });

  it("sort=tracked orders by total seconds desc", () => {
    const out = sortTasks([a, b, c], "tracked");
    expect(out[0].id).toBe("c");
  });

  it("sort=alpha orders by title", () => {
    const out = sortTasks(
      [task({ id: "z", title: "Zeta" }), task({ id: "a", title: "Alpha" })],
      "alpha",
    );
    expect(out[0].id).toBe("a");
  });

  it("sort=updated falls back to most-recent first", () => {
    const out = sortTasks([a, b, c], "updated");
    expect(out.map((t) => t.id)).toEqual(["c", "a", "b"]);
  });

  it("sort=suggested delegates to sortBySuggestion", () => {
    const running = task({ id: "run", active: true, priority: "none" });
    const out = sortTasks([a, running, b], "suggested", NOW);
    expect(out[0].id).toBe("run");
  });

  it("sort=created orders by creation date desc", () => {
    const old = task({ id: "old", createdAt: NOW - 100_000_000 });
    const fresh = task({ id: "fresh", createdAt: NOW - 1_000 });
    const out = sortTasks([old, fresh], "created");
    expect(out.map((t) => t.id)).toEqual(["fresh", "old"]);
  });

  it("ties in alpha sort fall through to id", () => {
    const a1 = task({ id: "a1", title: "Same" });
    const a2 = task({ id: "a2", title: "Same" });
    const out = sortTasks([a2, a1], "alpha");
    expect(out.map((t) => t.id)).toEqual(["a1", "a2"]);
  });
});

describe("sortBySuggestion", () => {
  it("pins the running task first regardless of priority", () => {
    const r = task({ id: "r", active: true, priority: "none" });
    const u = task({ id: "u", priority: "urgent", updatedAt: NOW - 1000 });
    const out = sortBySuggestion([u, r], NOW);
    expect(out[0].id).toBe("r");
  });

  it("places urgent/high tasks updated in the last 7 days above tracked", () => {
    const tracked = task({
      id: "tr",
      priority: "low",
      totalSec: 9999,
      updatedAt: NOW - 1000,
    });
    const urgentRecent = task({
      id: "ur",
      priority: "urgent",
      updatedAt: NOW - 3 * 86_400_000,
    });
    const out = sortBySuggestion([tracked, urgentRecent], NOW);
    expect(out[0].id).toBe("ur");
  });

  it("demotes urgent tasks older than 7 days to the recent-tracked bucket", () => {
    const oldUrgent = task({
      id: "old",
      priority: "urgent",
      updatedAt: NOW - 30 * 86_400_000,
      totalSec: 0,
    });
    const recentTracked = task({
      id: "rec",
      priority: "low",
      updatedAt: NOW - 1000,
      totalSec: 100,
    });
    const out = sortBySuggestion([oldUrgent, recentTracked], NOW);
    expect(out[0].id).toBe("rec");
  });

  it("breaks ties in the same bucket by priority weight then recency", () => {
    // Two recent urgent/high tasks → bucket 1; urgent should come before high.
    const high = task({
      id: "h",
      priority: "high",
      updatedAt: NOW - 60_000,
    });
    const urgent = task({
      id: "u",
      priority: "urgent",
      updatedAt: NOW - 120_000,
    });
    const out = sortBySuggestion([high, urgent], NOW);
    expect(out.map((t) => t.id)).toEqual(["u", "h"]);
  });

  it("orders the 'everything else' bucket by recency", () => {
    const older = task({
      id: "older",
      priority: "none",
      totalSec: 0,
      updatedAt: NOW - 100_000,
    });
    const newer = task({
      id: "newer",
      priority: "none",
      totalSec: 0,
      updatedAt: NOW - 1_000,
    });
    const out = sortBySuggestion([older, newer], NOW);
    expect(out.map((t) => t.id)).toEqual(["newer", "older"]);
  });
});

describe("topPriorityForToday", () => {
  it("returns null when no urgent or high priority is active", () => {
    expect(
      topPriorityForToday([
        task({ id: "a", priority: "low" }),
        task({ id: "b", priority: "medium" }),
      ]),
    ).toBeNull();
  });

  it("prefers urgent over high", () => {
    const top = topPriorityForToday([
      task({ id: "h", priority: "high", updatedAt: NOW }),
      task({ id: "u", priority: "urgent", updatedAt: NOW - 5000 }),
    ]);
    expect(top?.id).toBe("u");
  });

  it("excludes archived/completed tasks", () => {
    const top = topPriorityForToday([
      task({ id: "u", priority: "urgent", archivedAt: NOW - 100 }),
      task({ id: "h", priority: "high", completedAt: NOW - 50 }),
      task({ id: "k", priority: "high" }),
    ]);
    expect(top?.id).toBe("k");
  });
});

describe("hasActiveFilters", () => {
  it("treats the default state as inactive", () => {
    expect(hasActiveFilters(DEFAULT_TASK_FILTERS)).toBe(false);
  });

  it("flags any non-default chip / query as active", () => {
    const cases: TaskFilters[] = [
      { ...DEFAULT_TASK_FILTERS, query: "x" },
      { ...DEFAULT_TASK_FILTERS, projectIds: ["a"] },
      { ...DEFAULT_TASK_FILTERS, sources: ["linear"] },
      { ...DEFAULT_TASK_FILTERS, tags: ["ops"] },
      { ...DEFAULT_TASK_FILTERS, priorities: ["urgent"] },
      { ...DEFAULT_TASK_FILTERS, status: "archived" },
    ];
    for (const c of cases) {
      expect(hasActiveFilters(c)).toBe(true);
    }
  });
});

describe("priorityLabel + priorityColor", () => {
  const all: TaskPriority[] = ["urgent", "high", "medium", "low", "none"];

  it("returns a non-empty label for every priority", () => {
    for (const p of all) {
      const label = priorityLabel(p);
      expect(label.length).toBeGreaterThan(0);
      // Labels are capitalised words.
      expect(label[0]).toBe(label[0].toUpperCase());
    }
  });

  it("returns a hex colour for every priority", () => {
    for (const p of all) {
      expect(priorityColor(p)).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("renders distinct colours for the most-distinct priorities", () => {
    expect(priorityColor("urgent")).not.toBe(priorityColor("none"));
    expect(priorityColor("high")).not.toBe(priorityColor("low"));
  });
});
