import { powerMonitor } from 'electron';
import { entries } from '../db/repos/entries';
import { settings as settingsRepo } from '../db/repos/settings';
import { nudges as nudgesRepo } from '../db/repos/nudges';
import { broadcast } from '../ipc/events';
import { spawnToast, closeToast } from '../windows/manager';
import { getFillSuggestions } from './fillSuggestions';
import type {
  IdleNudgePayload,
  RetroNudgePayload,
} from '@shared/models';

type ActiveNudge = IdleNudgePayload | RetroNudgePayload;

const POLL_MS = 30_000;
const RESUME_THRESHOLD_SEC = 5;
const AUTO_DISCARD_MS = 2 * 60 * 60 * 1000;
const RETRO_COOLDOWN_MS = 30 * 60 * 1000;

const activeNudges = new Map<'idle_recover' | 'retro_fill', ActiveNudge>();
const autoDiscardTimers = new Map<'idle_recover' | 'retro_fill', NodeJS.Timeout>();
let pollTimer: NodeJS.Timeout | null = null;
let pendingIdle: { startedAt: number; taskIdAtIdle: string | null } | null = null;
let lastRetroAt = 0;

export function startIdleService(): void {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    try {
      tick();
    } catch (e) {
      console.error('[idle] tick failed', e);
    }
  }, POLL_MS);
}

export function stopIdleService(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  for (const t of autoDiscardTimers.values()) clearTimeout(t);
  autoDiscardTimers.clear();
}

export function getActiveNudge(kind: 'idle_recover' | 'retro_fill'): ActiveNudge | null {
  return activeNudges.get(kind) ?? null;
}

export function clearNudge(kind: 'idle_recover' | 'retro_fill'): void {
  activeNudges.delete(kind);
  const t = autoDiscardTimers.get(kind);
  if (t) {
    clearTimeout(t);
    autoDiscardTimers.delete(kind);
  }
}

function tick(): void {
  const idleSec = powerMonitor.getSystemIdleTime();
  const now = Date.now();
  const cur = entries.open();
  const cfg = settingsRepo.getAll();
  const idleThreshold = cfg.idleThresholdMinutes * 60;

  // ── 1. Idle recovery state machine ───────────────────────────────────────
  if (cur && idleSec >= idleThreshold && !pendingIdle) {
    pendingIdle = {
      startedAt: now - idleSec * 1000,
      taskIdAtIdle: cur.taskId,
    };
  } else if (pendingIdle && idleSec < RESUME_THRESHOLD_SEC) {
    const gapEndedAt = now - idleSec * 1000;
    const payload: IdleNudgePayload = {
      kind: 'idle_recover',
      gapStartedAt: pendingIdle.startedAt,
      gapEndedAt,
      durationMinutes: Math.max(1, Math.floor((gapEndedAt - pendingIdle.startedAt) / 60_000)),
      taskIdAtIdle: pendingIdle.taskIdAtIdle,
    };
    fire('idle_recover', payload, cfg.nudges.idleRecovery);
    pendingIdle = null;
  }

  // ── 2. Retro fill ───────────────────────────────────────────────────────
  if (!cur && !pendingIdle && now - lastRetroAt > RETRO_COOLDOWN_MS) {
    const last = entries.lastClosed();
    if (last && last.endedAt) {
      const gapMin = (now - last.endedAt) / 60_000;
      if (gapMin >= cfg.fillGapMinutes) {
        const payload: RetroNudgePayload = {
          kind: 'retro_fill',
          gapStartedAt: last.endedAt,
          gapEndedAt: now,
          durationMinutes: Math.floor(gapMin),
          suggestions: getFillSuggestions(),
        };
        fire('retro_fill', payload, cfg.nudges.retroactiveFill);
        lastRetroAt = now;
      }
    }
  }
}

function fire(
  kind: 'idle_recover' | 'retro_fill',
  payload: ActiveNudge,
  surface: boolean,
): void {
  activeNudges.set(kind, payload);
  nudgesRepo.shown(kind, payload);
  broadcast('nudge:fire', payload);
  if (surface) {
    spawnToast(kind);
  }
  scheduleAutoDiscard(kind);
}

function scheduleAutoDiscard(kind: 'idle_recover' | 'retro_fill'): void {
  const existing = autoDiscardTimers.get(kind);
  if (existing) clearTimeout(existing);
  const t = setTimeout(() => {
    activeNudges.delete(kind);
    nudgesRepo.dismissed(kind);
    closeToast(kind);
    autoDiscardTimers.delete(kind);
  }, AUTO_DISCARD_MS);
  autoDiscardTimers.set(kind, t);
}
