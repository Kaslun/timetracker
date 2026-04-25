export function startOfDay(ts: number = Date.now()): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfDay(ts: number = Date.now()): number {
  const d = new Date(ts);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function startOfWeek(ts: number = Date.now()): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay() || 7; // Mon=1..Sun=7
  if (day !== 1) d.setHours(-24 * (day - 1));
  return d.getTime();
}

export function endOfWeek(ts: number = Date.now()): number {
  const start = new Date(startOfWeek(ts));
  start.setDate(start.getDate() + 6);
  start.setHours(23, 59, 59, 999);
  return start.getTime();
}
