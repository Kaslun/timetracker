/**
 * Pure, dependency-free helpers for the per-day "work hours" gate.
 *
 * Lives in shared/ so both the main process (idle service) and unit tests
 * can use it without dragging in Electron.
 */
import type {
  LegacyWorkHours,
  WorkHours,
  WorkHoursDay,
  WorkHoursRange,
  WeekdayId,
} from "./types";
import { WEEKDAY_IDS } from "./types";
import { emptyWorkHours, MAX_WORK_HOURS_RANGES } from "./constants";

const DAYS_BY_INDEX: WeekdayId[] = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

function parseHHMM(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/**
 * True if `now` falls inside *any* enabled range for the current weekday.
 * An all-disabled `WorkHours` map means "nudges allowed 24/7".
 */
export function withinWorkHours(
  hours: WorkHours,
  now: Date = new Date(),
): boolean {
  const anyEnabled = WEEKDAY_IDS.some((d) => hours[d]?.enabled);
  if (!anyEnabled) return true;

  const day = hours[DAYS_BY_INDEX[now.getDay()]];
  if (!day || !day.enabled) return false;

  const minutesNow = now.getHours() * 60 + now.getMinutes();
  for (const r of day.ranges) {
    const from = parseHHMM(r.from);
    const to = parseHHMM(r.to);
    if (from === null || to === null) continue;
    if (to > from) {
      if (minutesNow >= from && minutesNow < to) return true;
    } else {
      // Wrap past midnight (e.g. 22:00 → 02:00).
      if (minutesNow >= from || minutesNow < to) return true;
    }
  }
  return false;
}

/**
 * Result of validating a single day's ranges. `ok` is true when every range
 * has `from < to` (no overnight wrap), no two ranges overlap, and the count
 * is within `MAX_WORK_HOURS_RANGES`.
 */
export interface RangeValidation {
  ok: boolean;
  errors: string[];
}

export function validateDayRanges(day: WorkHoursDay): RangeValidation {
  const errors: string[] = [];
  if (day.ranges.length > MAX_WORK_HOURS_RANGES) {
    errors.push(`At most ${MAX_WORK_HOURS_RANGES} ranges per day.`);
  }
  const parsed: { from: number; to: number; idx: number }[] = [];
  day.ranges.forEach((r, idx) => {
    const from = parseHHMM(r.from);
    const to = parseHHMM(r.to);
    if (from === null || to === null) {
      errors.push(`Range ${idx + 1}: invalid time.`);
      return;
    }
    if (from >= to) {
      errors.push(`Range ${idx + 1}: end must be after start.`);
      return;
    }
    parsed.push({ from, to, idx });
  });
  parsed.sort((a, b) => a.from - b.from);
  for (let i = 1; i < parsed.length; i++) {
    if (parsed[i].from < parsed[i - 1].to) {
      errors.push(
        `Range ${parsed[i].idx + 1} overlaps range ${parsed[i - 1].idx + 1}.`,
      );
    }
  }
  return { ok: errors.length === 0, errors };
}

/**
 * Convert the legacy `{ days, from, to }` shape to the new per-day map.
 * Used during settings hydration so v4 stores keep working post-upgrade.
 */
export function migrateLegacyWorkHours(
  legacy: LegacyWorkHours | null,
): WorkHours {
  const out = emptyWorkHours();
  if (!legacy) return out;
  for (const day of legacy.days) {
    if (!WEEKDAY_IDS.includes(day)) continue;
    out[day] = {
      enabled: true,
      ranges: [{ from: legacy.from, to: legacy.to }],
    };
  }
  return out;
}

export type { WorkHoursRange };
