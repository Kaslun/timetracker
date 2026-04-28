import { describe, expect, it } from "vitest";
import {
  withinWorkHours,
  validateDayRanges,
  migrateLegacyWorkHours,
} from "../../src/shared/workHours";
import { emptyWorkHours } from "../../src/shared/constants";
import type { WorkHours, LegacyWorkHours } from "../../src/shared/types";

/**
 * Helper: fully-disabled work hours map. Tests then turn on individual days
 * with a specific range. Avoids depending on `DEFAULT_WORK_HOURS` so the
 * defaults can change without breaking these tests.
 */
function blank(): WorkHours {
  return emptyWorkHours();
}

const at = (iso: string): Date => new Date(iso);

describe("withinWorkHours", () => {
  it("returns true on a weekday inside the window", () => {
    const wh = blank();
    wh.Mon = { enabled: true, ranges: [{ from: "09:00", to: "17:00" }] };
    // 2026-01-05 is a Monday
    expect(withinWorkHours(wh, at("2026-01-05T10:00:00"))).toBe(true);
  });

  it("returns false outside the window same day", () => {
    const wh = blank();
    wh.Mon = { enabled: true, ranges: [{ from: "09:00", to: "17:00" }] };
    expect(withinWorkHours(wh, at("2026-01-05T18:00:00"))).toBe(false);
  });

  it("returns false on a day not enabled", () => {
    const wh = blank();
    wh.Mon = { enabled: true, ranges: [{ from: "09:00", to: "17:00" }] };
    // Sunday — Sun day is disabled
    expect(withinWorkHours(wh, at("2026-01-04T12:00:00"))).toBe(false);
  });

  it("supports multiple ranges per day (lunch break gap)", () => {
    const wh = blank();
    wh.Mon = {
      enabled: true,
      ranges: [
        { from: "09:00", to: "12:00" },
        { from: "13:00", to: "17:00" },
      ],
    };
    expect(withinWorkHours(wh, at("2026-01-05T10:30:00"))).toBe(true);
    expect(withinWorkHours(wh, at("2026-01-05T15:00:00"))).toBe(true);
    // Inside the lunch gap
    expect(withinWorkHours(wh, at("2026-01-05T12:30:00"))).toBe(false);
  });

  it("treats an all-disabled map as 'allowed 24/7'", () => {
    const wh = blank();
    expect(withinWorkHours(wh, at("2026-01-05T03:00:00"))).toBe(true);
  });

  it("supports a range that wraps past midnight (e.g. 22:00 → 02:00)", () => {
    const wh = blank();
    wh.Mon = { enabled: true, ranges: [{ from: "22:00", to: "02:00" }] };
    // 23:00 Monday — past start
    expect(withinWorkHours(wh, at("2026-01-05T23:00:00"))).toBe(true);
    // 01:00 Monday — before the wrap-end (matches the same Mon range)
    expect(withinWorkHours(wh, at("2026-01-05T01:00:00"))).toBe(true);
    // 03:00 Monday — outside both halves
    expect(withinWorkHours(wh, at("2026-01-05T03:00:00"))).toBe(false);
  });

  it("ignores ranges with malformed time strings", () => {
    const wh = blank();
    wh.Mon = {
      enabled: true,
      ranges: [{ from: "not-a-time", to: "also-bad" }],
    };
    expect(withinWorkHours(wh, at("2026-01-05T10:00:00"))).toBe(false);
  });
});

describe("validateDayRanges", () => {
  it("rejects an end time that's not after the start", () => {
    const r = validateDayRanges({
      enabled: true,
      ranges: [{ from: "10:00", to: "10:00" }],
    });
    expect(r.ok).toBe(false);
  });

  it("rejects ranges that overlap each other", () => {
    const r = validateDayRanges({
      enabled: true,
      ranges: [
        { from: "09:00", to: "13:00" },
        { from: "12:00", to: "17:00" },
      ],
    });
    expect(r.ok).toBe(false);
  });

  it("accepts a clean two-range day", () => {
    const r = validateDayRanges({
      enabled: true,
      ranges: [
        { from: "09:00", to: "12:00" },
        { from: "13:00", to: "17:00" },
      ],
    });
    expect(r.ok).toBe(true);
  });

  it("rejects more than the documented max of 3 ranges", () => {
    const r = validateDayRanges({
      enabled: true,
      ranges: [
        { from: "09:00", to: "10:00" },
        { from: "11:00", to: "12:00" },
        { from: "13:00", to: "14:00" },
        { from: "15:00", to: "16:00" },
      ],
    });
    expect(r.ok).toBe(false);
  });

  it("flags a malformed time string as invalid", () => {
    const r = validateDayRanges({
      enabled: true,
      ranges: [{ from: "9 oclock", to: "17:00" }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toMatch(/invalid time/i);
  });
});

describe("migrateLegacyWorkHours", () => {
  it("returns an empty (all-disabled) map when given null", () => {
    const out = migrateLegacyWorkHours(null);
    expect(out.Sat.enabled).toBe(false);
    expect(out.Mon.enabled).toBe(false);
  });

  it("converts a legacy single-range definition into per-day map", () => {
    const legacy: LegacyWorkHours = {
      days: ["Mon", "Wed", "Fri"],
      from: "10:00",
      to: "16:00",
    };
    const out = migrateLegacyWorkHours(legacy);
    expect(out.Mon).toEqual({
      enabled: true,
      ranges: [{ from: "10:00", to: "16:00" }],
    });
    expect(out.Wed.enabled).toBe(true);
    expect(out.Tue.enabled).toBe(false);
    expect(out.Sat.enabled).toBe(false);
  });
});
