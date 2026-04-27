/**
 * Centralized quit flow.
 *
 * Every "user wants to fully exit" path (tray, menu, pill close button,
 * Ctrl+Shift+Q, IPC) goes through `requestQuit()`. We compute today's
 * loose-time summary and, if there are any gaps, spawn the End-of-day
 * prompt window so the user can fill them. The prompt itself decides when
 * to call `quitNow()`.
 */
import { app } from "electron";
import { entries } from "../db/repos/entries";
import { startOfDay } from "../db/utils";
import { ensureEod, closeEod } from "../windows/eod";

const DAY_START_HOUR = 8;
const DAY_END_HOUR = 19;

interface EodGap {
  startedAt: number;
  endedAt: number;
  minutes: number;
}

export interface EodSummary {
  loggedSec: number;
  looseSec: number;
  gaps: EodGap[];
}

let quitPending = false;
let cachedSummary: EodSummary | null = null;

/** Compute today's logged seconds, loose seconds, and the gap list. */
export function computeEodSummary(now: number = Date.now()): EodSummary {
  const dayStart = startOfDay(now);
  const list = entries.list({
    from: dayStart,
    to: dayStart + 24 * 60 * 60_000,
  });

  const loggedSec = list.reduce(
    (acc, e) => acc + ((e.endedAt ?? now) - e.startedAt) / 1000,
    0,
  );

  const startMs = dayStart + DAY_START_HOUR * 60 * 60_000;
  const endMs = dayStart + DAY_END_HOUR * 60 * 60_000;
  const sorted = [...list].sort((a, b) => a.startedAt - b.startedAt);

  const gaps: EodGap[] = [];
  let cursor = startMs;
  for (const e of sorted) {
    const eStart = Math.max(e.startedAt, startMs);
    const eEnd = Math.min(e.endedAt ?? now, endMs);
    if (eEnd <= cursor) continue;
    if (eStart > cursor) {
      const minutes = Math.round((eStart - cursor) / 60_000);
      if (minutes >= 5) {
        gaps.push({ startedAt: cursor, endedAt: eStart, minutes });
      }
    }
    cursor = eEnd;
  }
  // Trailing gap up to the current moment (within work hours).
  const upper = Math.min(now, endMs);
  if (upper > cursor) {
    const minutes = Math.round((upper - cursor) / 60_000);
    if (minutes >= 5) {
      gaps.push({ startedAt: cursor, endedAt: upper, minutes });
    }
  }
  const looseSec = gaps.reduce((acc, g) => acc + g.minutes * 60, 0);
  return { loggedSec: Math.round(loggedSec), looseSec, gaps };
}

/** Snapshot read by the renderer when the EoD modal mounts. */
export function getCachedSummary(): EodSummary {
  return cachedSummary ?? computeEodSummary();
}

/**
 * Entry point used by every "quit" affordance. If the user has any loose
 * minutes today, opens the EoD window and defers `app.quit()`. Otherwise
 * quits immediately.
 */
export function requestQuit(): void {
  if (quitPending) {
    // Already showing — bring window forward instead of stacking dialogs.
    const win = ensureEod();
    win.show();
    win.focus();
    return;
  }
  const summary = computeEodSummary();
  if (summary.gaps.length === 0) {
    quitNow();
    return;
  }
  cachedSummary = summary;
  quitPending = true;
  ensureEod();
}

/** Bypass the prompt (called from the EoD modal once the user is done). */
export function quitNow(): void {
  closeEod();
  cachedSummary = null;
  quitPending = false;
  app.quit();
}

/** Cancel a pending quit (the EoD modal was dismissed). */
export function cancelQuit(): void {
  cachedSummary = null;
  quitPending = false;
  closeEod();
}
