/**
 * Pure timeline helpers shared between the renderer (drag/snap UI) and the
 * main process (overlap enforcement on insert/update).
 *
 * Conventions:
 *  - All times are wall-clock milliseconds since epoch.
 *  - `entry.startedAt` / `entry.endedAt` stay precise (down to the ms) for
 *    accurate Tempo worklog totals — never quantized in the DB.
 *  - The `gridStart` / `gridEnd` derived values *are* quantized to the
 *    `SNAP_MS` grid for display + edit affordances.
 *
 * Snap math is multiplication-free and locale-independent; it can run in any
 * JS environment (no Date arithmetic).
 */

/** Snap window. Keep at 5 min; the timeline UI assumes this granularity. */
export const SNAP_MIN = 5;
export const SNAP_MS = SNAP_MIN * 60_000;
/** Minimum block duration the UI lets the user create or shrink to. */
export const MIN_DURATION_MS = SNAP_MS;

/** Round `ms` to the nearest `SNAP_MS` boundary (banker's-style halfway up). */
export function snapToGrid(ms: number): number {
  return Math.round(ms / SNAP_MS) * SNAP_MS;
}

/** Floor / ceil variants for use when rounding "always down/up" is required. */
export function snapFloor(ms: number): number {
  return Math.floor(ms / SNAP_MS) * SNAP_MS;
}
export function snapCeil(ms: number): number {
  return Math.ceil(ms / SNAP_MS) * SNAP_MS;
}

/** Display bounds for an entry: snapped to the 5-min grid. */
export interface GridBounds {
  gridStart: number;
  gridEnd: number;
}

/** Minimal interval shape; concrete `Entry` rows satisfy this. */
export interface Interval {
  id?: string;
  startedAt: number;
  endedAt: number | null;
}

/**
 * Compute display bounds for an entry. Open entries (endedAt === null) snap
 * the start; the end stays "live" and the renderer fills it in from `Date.now()`.
 */
export function gridBounds(entry: Interval): GridBounds {
  const gridStart = snapFloor(entry.startedAt);
  const end = entry.endedAt ?? entry.startedAt + MIN_DURATION_MS;
  const gridEnd = Math.max(gridStart + MIN_DURATION_MS, snapCeil(end));
  return { gridStart, gridEnd };
}

/** True if two closed intervals overlap (open at boundary = no overlap). */
export function overlaps(
  a: { startedAt: number; endedAt: number | null },
  b: { startedAt: number; endedAt: number | null },
): boolean {
  const aEnd = a.endedAt ?? Number.POSITIVE_INFINITY;
  const bEnd = b.endedAt ?? Number.POSITIVE_INFINITY;
  return a.startedAt < bEnd && b.startedAt < aEnd;
}

/** Find every interval in `others` that overlaps the proposed range. */
export function findOverlaps<T extends Interval>(
  proposed: { startedAt: number; endedAt: number | null },
  others: readonly T[],
  excludeId?: string,
): T[] {
  return others.filter(
    (o) => (!excludeId || o.id !== excludeId) && overlaps(proposed, o),
  );
}

/**
 * Adjust a proposed range so it fits *between* its neighbours without
 * overlapping. Returns null if no adjustment is possible (e.g. neighbours
 * already touch the proposed start).
 *
 * Used by the timeline drag/resize handlers: when the user drags into a
 * neighbour, we clamp to the neighbour's edge instead of rejecting.
 */
export function clampToNeighbours<T extends Interval>(
  proposed: { startedAt: number; endedAt: number },
  others: readonly T[],
  excludeId?: string,
): { startedAt: number; endedAt: number } | null {
  let start = proposed.startedAt;
  let end = proposed.endedAt;
  for (const o of others) {
    if (excludeId && o.id === excludeId) continue;
    const oEnd = o.endedAt ?? Number.POSITIVE_INFINITY;
    // Neighbour entirely before the proposed range: clamp our start up.
    if (oEnd <= proposed.startedAt) continue;
    // Neighbour entirely after the proposed range: clamp our end down.
    if (o.startedAt >= proposed.endedAt) continue;
    // Overlap on the leading edge.
    if (o.startedAt <= start && oEnd > start) {
      start = oEnd;
    }
    // Overlap on the trailing edge.
    if (o.startedAt < end && oEnd >= end) {
      end = o.startedAt;
    }
  }
  if (end - start < MIN_DURATION_MS) return null;
  return { startedAt: start, endedAt: end };
}

/**
 * Split an existing interval around a new range, returning the pieces that
 * should *replace* the original. Used by the "Split" conflict-resolution
 * action when a user inserts a new entry that overlaps an existing one.
 *
 * Returns 0–2 pieces: each one is at least `MIN_DURATION_MS` long.
 */
export function splitAround(
  existing: { startedAt: number; endedAt: number | null },
  cut: { startedAt: number; endedAt: number },
): Array<{ startedAt: number; endedAt: number }> {
  const pieces: Array<{ startedAt: number; endedAt: number }> = [];
  const existingEnd = existing.endedAt ?? cut.endedAt;
  if (existing.startedAt < cut.startedAt) {
    const left = { startedAt: existing.startedAt, endedAt: cut.startedAt };
    if (left.endedAt - left.startedAt >= MIN_DURATION_MS) pieces.push(left);
  }
  if (existingEnd > cut.endedAt) {
    const right = { startedAt: cut.endedAt, endedAt: existingEnd };
    if (right.endedAt - right.startedAt >= MIN_DURATION_MS) pieces.push(right);
  }
  return pieces;
}

/**
 * Discriminated outcome of a conflict check. Renderer + IPC use this to
 * decide whether to prompt the user, snap to a neighbour, or proceed clean.
 */
export type ConflictOutcome<T extends Interval = Interval> =
  | { kind: "ok" }
  | { kind: "trim"; adjusted: { startedAt: number; endedAt: number } }
  | { kind: "conflict"; conflictsWith: T[] };

/**
 * Decide what to do with a proposed entry given its neighbours.
 *
 * Strategy:
 *   - No overlap → ok.
 *   - Overlap touches *only* the leading or trailing edge of one neighbour
 *     and we can trim without dropping below MIN_DURATION_MS → trim.
 *   - Otherwise → conflict (UI must prompt: replace / split / cancel).
 */
export function resolveConflict<T extends Interval>(
  proposed: { startedAt: number; endedAt: number },
  others: readonly T[],
  excludeId?: string,
): ConflictOutcome<T> {
  const hits = findOverlaps(proposed, others, excludeId);
  if (hits.length === 0) return { kind: "ok" };
  const adjusted = clampToNeighbours(proposed, hits, excludeId);
  if (adjusted && adjusted.endedAt - adjusted.startedAt >= MIN_DURATION_MS) {
    const stillHits = findOverlaps(adjusted, hits, excludeId);
    if (stillHits.length === 0) return { kind: "trim", adjusted };
  }
  return { kind: "conflict", conflictsWith: hits };
}
