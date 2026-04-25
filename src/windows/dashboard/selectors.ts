import type { EntryRow } from '@shared/models';
import { startOfWeek, endOfWeek, isoDate } from '@/shared/time';

export interface DayBucket {
  day: string;        // "Mon"
  dateIso: string;    // "2026-04-21"
  hours: number;
  isToday: boolean;
  perProject: { projectId: string; projectName: string; projectColor: string; hours: number }[];
}

export interface ProjectAgg {
  projectId: string;
  projectName: string;
  projectColor: string;
  hours: number;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function bucketByDay(entries: EntryRow[], anchor: Date): DayBucket[] {
  const start = startOfWeek(anchor);
  const end = endOfWeek(anchor);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets: DayBucket[] = [];
  for (let i = 0; i < 5; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    buckets.push({
      day: DAY_LABELS[i],
      dateIso: isoDate(day),
      hours: 0,
      isToday: day.getTime() === today.getTime(),
      perProject: [],
    });
  }

  const inWeek = entries.filter(
    (e) => e.startedAt >= start.getTime() && e.startedAt <= end.getTime()
  );

  const now = Date.now();
  for (const e of inWeek) {
    const d = new Date(e.startedAt);
    d.setHours(0, 0, 0, 0);
    const bucket = buckets.find((b) => b.dateIso === isoDate(d));
    if (!bucket) continue;
    const dur = ((e.endedAt ?? now) - e.startedAt) / 3_600_000;
    bucket.hours += dur;
    const existing = bucket.perProject.find((p) => p.projectId === e.projectId);
    if (existing) existing.hours += dur;
    else
      bucket.perProject.push({
        projectId: e.projectId,
        projectName: e.projectName,
        projectColor: e.projectColor,
        hours: dur,
      });
  }

  for (const b of buckets) {
    b.perProject.sort((a, c) => c.hours - a.hours);
  }
  return buckets;
}

export function aggregateByProject(entries: EntryRow[]): ProjectAgg[] {
  const map = new Map<string, ProjectAgg>();
  const now = Date.now();
  for (const e of entries) {
    const dur = ((e.endedAt ?? now) - e.startedAt) / 3_600_000;
    const cur = map.get(e.projectId);
    if (cur) cur.hours += dur;
    else
      map.set(e.projectId, {
        projectId: e.projectId,
        projectName: e.projectName,
        projectColor: e.projectColor,
        hours: dur,
      });
  }
  return Array.from(map.values()).sort((a, b) => b.hours - a.hours);
}

export function countFocusSessions(entries: EntryRow[]): number {
  // A "focus session" is an entry of >= 25 minutes (sprint length)
  const min = 25 * 60_000;
  const now = Date.now();
  return entries.filter((e) => ((e.endedAt ?? now) - e.startedAt) >= min).length;
}

export function avgFocusMinutes(entries: EntryRow[]): number {
  const min = 25 * 60_000;
  const now = Date.now();
  const sessions = entries.filter((e) => ((e.endedAt ?? now) - e.startedAt) >= min);
  if (sessions.length === 0) return 0;
  const total = sessions.reduce((acc, e) => acc + ((e.endedAt ?? now) - e.startedAt) / 60_000, 0);
  return Math.round(total / sessions.length);
}

export function weekNumber(d: Date = new Date()): number {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604_800_000);
}

export function fmtPeriod(anchor: Date): { label: string; range: string } {
  const start = startOfWeek(anchor);
  const end = endOfWeek(anchor);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const range = `${months[start.getMonth()]} ${start.getDate()} – ${end.getDate()}`;
  return { label: `Week ${weekNumber(anchor)} · ${range}`, range };
}
