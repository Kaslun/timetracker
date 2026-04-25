import { BrowserWindow } from "electron";
import { EVENTS, type EventName, type EventPayload } from "@shared/schemas";
import { logger } from "../services/logger";

const log = logger("ipc");

/**
 * Push an event to every renderer process. Payloads are validated against the
 * Zod schema in `EVENTS` so renderer code can rely on shapes without a second
 * runtime guard.
 */
export function broadcast<E extends EventName>(
  event: E,
  payload: EventPayload<E>,
): void {
  const parsed = EVENTS[event].safeParse(payload);
  if (!parsed.success) {
    log.error(`broadcast(${event}) payload failed validation`, parsed.error);
    return;
  }
  for (const w of BrowserWindow.getAllWindows()) {
    if (w.isDestroyed()) continue;
    w.webContents.send(event, parsed.data);
  }
}

/** Same as `broadcast` but limited to a single window. */
export function sendTo<E extends EventName>(
  win: BrowserWindow,
  event: E,
  payload: EventPayload<E>,
): void {
  if (win.isDestroyed()) return;
  const parsed = EVENTS[event].safeParse(payload);
  if (!parsed.success) return;
  win.webContents.send(event, parsed.data);
}
