/**
 * Daily "top priority for today" nudge service.
 *
 * Fires once per work-day at the first work-hours tick after launch.
 * Picks the user's highest-priority active task (urgent → high) using the
 * shared `topPriorityForToday` selector and broadcasts a single
 * `topPriority:fire` event to renderers. Renderers surface it as a
 * low-key inline banner.
 *
 * Idempotency: the last-fired calendar day is stored in the `nudges` repo
 * under kind `"top_priority"` (`last_shown_at`). We only fire again once
 * the calendar day flips. Dismissed nudges still respect the same
 * day-boundary rule — no re-firing within the same day.
 *
 * Gating:
 *   - Within work-hours (`withinWorkHours(settings.workHours)`).
 *   - Respects `respectSystemDnd` like the other nudges.
 *   - Future: a `nudges.dailyTopPriority` toggle could disable it
 *     entirely; we currently key off the work-hours gate alone.
 */
import type { Settings, TopPriorityNudgePayload } from "@shared/types";
import { withinWorkHours } from "@shared/workHours";
import { topPriorityForToday } from "@shared/lib/taskFilter";
import { tasks as tasksRepo } from "../db/repos/tasks";
import { nudges as nudgesRepo } from "../db/repos/nudges";
import { settings as settingsRepo } from "../db/repos/settings";
import { broadcast } from "../ipc/events";
import { logger } from "./logger";

const log = logger("topPriorityNudge");

const TICK_MS = 60_000;
const KIND = "top_priority" as const;

let timer: NodeJS.Timeout | null = null;

export function startTopPriorityNudge(): void {
  if (timer) clearInterval(timer);
  // Run an initial tick on next tick so app boot doesn't pay the cost.
  setTimeout(tick, 5_000);
  timer = setInterval(tick, TICK_MS);
}

export function stopTopPriorityNudge(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

/** Exported for tests — drives one evaluation of the gate. */
export function tick(): void {
  try {
    const cfg = settingsRepo.getAll();
    if (!gateOpen(cfg)) return;
    if (alreadyFiredToday()) return;

    const candidates = tasksRepo.queryWithStats();
    const top = topPriorityForToday(candidates);
    if (!top) return;

    const payload: TopPriorityNudgePayload = {
      kind: KIND,
      taskId: top.id,
      taskTitle: top.title,
      ticket: top.ticket,
      projectName: top.projectName,
      projectColor: top.projectColor,
      priority: top.priority,
    };

    nudgesRepo.shown(KIND, { taskId: top.id, day: today() });
    broadcast("topPriority:fire", payload);
  } catch (e) {
    log.error("tick failed", e);
  }
}

function gateOpen(cfg: Settings): boolean {
  // We deliberately don't depend on `idle.systemDndActive` here — the
  // top-priority banner is intentionally low-key and doesn't punch
  // through DND any more aggressively than work-hours already gates.
  if (cfg.respectSystemDnd && systemDndActive()) return false;
  return withinWorkHours(cfg.workHours);
}

/** Stub mirrors `idle.ts` — Electron lacks portable DND query. */
function systemDndActive(): boolean {
  return false;
}

function alreadyFiredToday(): boolean {
  const row = nudgesRepo.get(KIND);
  if (!row?.lastShownAt) return false;
  return sameDay(row.lastShownAt, Date.now());
}

function today(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function sameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}
