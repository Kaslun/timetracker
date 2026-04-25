import { describe, expect, it } from "vitest";
import {
  clockTime,
  endOfDay,
  endOfWeek,
  formatElapsed,
  formatHM,
  formatHours,
  isoDate,
  startOfDay,
  startOfWeek,
} from "../../src/renderer/lib/time";

describe("formatElapsed", () => {
  it("formats sub-hour durations as MM:SS", () => {
    expect(formatElapsed(0)).toBe("00:00");
    expect(formatElapsed(59)).toBe("00:59");
    expect(formatElapsed(60)).toBe("01:00");
    expect(formatElapsed(125)).toBe("02:05");
  });

  it("formats hours+ as H:MM:SS with padded minutes", () => {
    expect(formatElapsed(3600)).toBe("1:00:00");
    expect(formatElapsed(3661)).toBe("1:01:01");
    expect(formatElapsed(7325)).toBe("2:02:05");
  });

  it("clamps negatives to zero", () => {
    expect(formatElapsed(-1)).toBe("00:00");
  });

  it("floors fractional seconds", () => {
    expect(formatElapsed(59.9)).toBe("00:59");
  });
});

describe("formatHM", () => {
  it("omits hours under 1h", () => {
    expect(formatHM(0)).toBe("0m");
    expect(formatHM(1800)).toBe("30m");
  });
  it("shows zero-padded minutes after the hour", () => {
    expect(formatHM(3600)).toBe("1h 00m");
    expect(formatHM(3661)).toBe("1h 01m");
    expect(formatHM(7320)).toBe("2h 02m");
  });
});

describe("formatHours", () => {
  it("returns hours rounded to two decimals", () => {
    expect(formatHours(3600)).toBe("1.00");
    expect(formatHours(5400)).toBe("1.50");
    expect(formatHours(0)).toBe("0.00");
  });
});

describe("day boundaries", () => {
  it("startOfDay zeros time", () => {
    const d = startOfDay(new Date("2026-04-25T18:32:01"));
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(d.getMilliseconds()).toBe(0);
  });
  it("endOfDay maxes time", () => {
    const d = endOfDay(new Date("2026-04-25T03:00:00"));
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(59);
    expect(d.getSeconds()).toBe(59);
    expect(d.getMilliseconds()).toBe(999);
  });
});

describe("week boundaries", () => {
  it("startOfWeek lands on Monday", () => {
    // Saturday 2026-04-25 → Monday 2026-04-20
    const start = startOfWeek(new Date("2026-04-25T12:00:00"));
    expect(start.getDay()).toBe(1);
    expect(start.getDate()).toBe(20);
  });
  it("endOfWeek is the following Sunday end-of-day", () => {
    const end = endOfWeek(new Date("2026-04-25T12:00:00"));
    expect(end.getDay()).toBe(0);
    expect(end.getDate()).toBe(26);
    expect(end.getHours()).toBe(23);
  });
});

describe("isoDate / clockTime", () => {
  it("isoDate uses local YYYY-MM-DD", () => {
    expect(isoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
  it("clockTime uses padded HH:MM", () => {
    expect(clockTime(new Date(2026, 0, 5, 3, 7))).toBe("03:07");
  });
});
