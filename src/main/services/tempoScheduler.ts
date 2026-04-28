/**
 * Periodic Tempo sync scheduler.
 *
 * While the app is running and the user has Jira → Tempo enabled, push
 * any outstanding worklog updates on a debounced 5-minute cadence. Also
 * triggers a final sync on `before-quit` so a fast Cmd-Q doesn't lose
 * progress.
 *
 * The actual push logic lives in `runTempoSync`; this module only owns
 * the timer / lifecycle. Manual "Sync now" still flows through the
 * `integration:tempoSync` IPC and bypasses the debounce.
 *
 * Errors are caught and logged — a flaky network must never crash the
 * scheduler. The next tick simply tries again.
 */
import { runTempoSync, tempoEnabled } from "../integrations/tempo";
import { settings as settingsRepo } from "../db/repos/settings";
import { logger } from "./logger";

const log = logger("tempoScheduler");

const DEFAULT_INTERVAL_MS = 5 * 60_000;

let timer: NodeJS.Timeout | null = null;

export function startTempoScheduler(): void {
  if (timer) clearInterval(timer);
  // Skip the very first tick — give the user time to settle and avoid
  // racing the bootstrap fetch.
  timer = setInterval(tick, DEFAULT_INTERVAL_MS);
}

export function stopTempoScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

/**
 * Final flush on app quit. Returns once the sync resolves so callers in
 * `before-quit` can `event.preventDefault()` until we're done if they
 * want a guaranteed-clean shutdown.
 */
export async function flushTempoOnQuit(): Promise<void> {
  try {
    const cfg = settingsRepo.getAll();
    if (!tempoEnabled(cfg)) return;
    await runTempoSync();
  } catch (e) {
    log.error("flush failed", e);
  }
}

async function tick(): Promise<void> {
  try {
    const cfg = settingsRepo.getAll();
    if (!tempoEnabled(cfg)) return;
    await runTempoSync();
  } catch (e) {
    log.error("tick failed", e);
  }
}
