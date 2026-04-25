import { BrowserWindow } from 'electron';
import { EVENTS, type EventName, type EventPayload } from '../shared/ipc';

export function broadcast<E extends EventName>(event: E, payload: EventPayload<E>): void {
  const schema = EVENTS[event];
  const parsed = (schema as { safeParse: (p: unknown) => { success: boolean; data: unknown; error?: unknown } }).safeParse(payload);
  if (!parsed.success) {
    console.error(`[ipc] broadcast(${event}) payload failed validation`, parsed.error);
    return;
  }
  for (const w of BrowserWindow.getAllWindows()) {
    if (w.isDestroyed()) continue;
    w.webContents.send(event, parsed.data);
  }
}

export function sendTo<E extends EventName>(win: BrowserWindow, event: E, payload: EventPayload<E>): void {
  if (win.isDestroyed()) return;
  const schema = EVENTS[event];
  const parsed = (schema as { safeParse: (p: unknown) => { success: boolean; data: unknown } }).safeParse(payload);
  if (!parsed.success) return;
  win.webContents.send(event, parsed.data);
}
