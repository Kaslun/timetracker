import { describe, expect, it } from "vitest";
import { withinWorkHours } from "../../src/shared/workHours";
import type { WorkHours } from "../../src/shared/types";

const MON_FRI_9_TO_5: WorkHours = {
  days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  from: "09:00",
  to: "17:00",
};

const NIGHT_SHIFT: WorkHours = {
  days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  from: "22:00",
  to: "02:00",
};

const at = (iso: string): Date => new Date(iso);

describe("withinWorkHours", () => {
  it("returns true when the window is null (always allow)", () => {
    expect(withinWorkHours(null, at("2026-01-05T12:00:00"))).toBe(true);
  });

  it("returns true on a weekday inside the window", () => {
    // 2026-01-05 is a Monday
    expect(withinWorkHours(MON_FRI_9_TO_5, at("2026-01-05T10:00:00"))).toBe(
      true,
    );
  });

  it("returns false outside the window same day", () => {
    expect(withinWorkHours(MON_FRI_9_TO_5, at("2026-01-05T18:00:00"))).toBe(
      false,
    );
  });

  it("returns false on a day not listed", () => {
    // Sunday
    expect(withinWorkHours(MON_FRI_9_TO_5, at("2026-01-04T12:00:00"))).toBe(
      false,
    );
  });

  it("supports wrap-around windows that cross midnight", () => {
    // 23:30 on a Monday should be inside a Mon 22:00 → 02:00 window
    expect(withinWorkHours(NIGHT_SHIFT, at("2026-01-05T23:30:00"))).toBe(true);
    // 01:30 on a Monday should also count as inside (Monday's wrap)
    expect(withinWorkHours(NIGHT_SHIFT, at("2026-01-05T01:30:00"))).toBe(true);
    // 04:00 outside
    expect(withinWorkHours(NIGHT_SHIFT, at("2026-01-05T04:00:00"))).toBe(false);
  });
});
