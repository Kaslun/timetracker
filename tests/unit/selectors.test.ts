import { describe, expect, it } from "vitest";
import {
  aggregateByProject,
  avgFocusMinutes,
  bucketByDay,
  countFocusSessions,
  fmtPeriod,
} from "../../src/renderer/features/dashboard/selectors";
import type { EntryRow } from "../../src/shared/types";

function row(
  partial: Partial<EntryRow> & { startedAt: number; endedAt: number | null },
): EntryRow {
  return {
    id: "e" + Math.random(),
    taskId: "t1",
    source: "manual",
    note: null,
    taskTitle: "Task",
    ticket: null,
    projectId: "p1",
    projectName: "Project",
    projectColor: "#000",
    tag: null,
    ...partial,
  };
}

describe("aggregateByProject", () => {
  it("sums hours per project and sorts descending", () => {
    const t = new Date("2026-04-20T10:00:00").getTime();
    const rows: EntryRow[] = [
      row({
        startedAt: t,
        endedAt: t + 60 * 60_000,
        projectId: "p1",
        projectName: "A",
      }),
      row({
        startedAt: t + 2 * 60 * 60_000,
        endedAt: t + 3 * 60 * 60_000,
        projectId: "p2",
        projectName: "B",
      }),
      row({
        startedAt: t + 4 * 60 * 60_000,
        endedAt: t + 7 * 60 * 60_000,
        projectId: "p2",
        projectName: "B",
      }),
    ];
    const agg = aggregateByProject(rows);
    expect(agg.map((p) => p.projectName)).toEqual(["B", "A"]);
    expect(agg[0].hours).toBeCloseTo(4, 5);
    expect(agg[1].hours).toBeCloseTo(1, 5);
  });
});

describe("countFocusSessions / avgFocusMinutes", () => {
  it("counts only entries >= 25 minutes", () => {
    const t = Date.now();
    const rows: EntryRow[] = [
      row({ startedAt: t, endedAt: t + 10 * 60_000 }), // 10m  no
      row({ startedAt: t + 60_000, endedAt: t + 35 * 60_000 }), // 34m yes
      row({ startedAt: t + 60 * 60_000, endedAt: t + 90 * 60_000 }), // 30m yes
    ];
    expect(countFocusSessions(rows)).toBe(2);
    expect(avgFocusMinutes(rows)).toBe(32);
  });
});

describe("bucketByDay", () => {
  it("returns 5 weekday buckets with hour totals", () => {
    const monday = new Date("2026-04-20T09:00:00");
    const rows: EntryRow[] = [
      row({
        startedAt: monday.getTime(),
        endedAt: monday.getTime() + 2 * 60 * 60_000,
      }),
    ];
    const buckets = bucketByDay(rows, monday);
    expect(buckets).toHaveLength(5);
    expect(buckets[0].day).toBe("Mon");
    expect(buckets[0].hours).toBeCloseTo(2, 5);
    expect(buckets[1].hours).toBe(0);
  });
});

describe("fmtPeriod", () => {
  it('renders a "Week N · Mon D – D" label', () => {
    const out = fmtPeriod(new Date("2026-04-22T12:00:00"));
    expect(out.label).toMatch(/^Week \d+ · Apr \d+ – \d+$/);
  });
});
