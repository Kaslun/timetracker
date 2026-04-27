/**
 * Pure, dependency-free helpers for the "work hours" gate.
 *
 * Lives in shared/ so both the main process (idle service) and unit tests
 * can use it without dragging in Electron.
 */
import type { WorkHours } from "./types";

const DAYS_BY_INDEX: WorkHours["days"][number][] = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

/** True if `now` falls inside the work-hours window. A null window allows
 *  nudges 24/7 (matches the v1 behavior when workHours is disabled). */
export function withinWorkHours(
  hours: WorkHours | null,
  now: Date = new Date(),
): boolean {
  if (!hours) return true;
  if (!hours.days.includes(DAYS_BY_INDEX[now.getDay()])) return false;
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const [fh, fm] = hours.from.split(":").map((s) => parseInt(s, 10));
  const [th, tm] = hours.to.split(":").map((s) => parseInt(s, 10));
  const fromMin = fh * 60 + fm;
  const toMin = th * 60 + tm;
  if (toMin > fromMin) return minutesNow >= fromMin && minutesNow < toMin;
  // Wrap past midnight (e.g. evening shift 22:00–02:00).
  return minutesNow >= fromMin || minutesNow < toMin;
}
