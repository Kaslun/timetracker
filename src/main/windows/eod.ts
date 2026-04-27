import type { BrowserWindow } from "electron";
import { createWindow } from "./factory";
import { state } from "./registry";

/**
 * End-of-day prompt — shown right before a full app quit.
 *
 * Modal-styled but its own window so the pill/expanded surface can collapse
 * normally underneath. Resolves with either a fill action (which writes
 * entries through normal IPC) or a "skip & quit" that triggers `app.quit()`.
 */
export function ensureEod(): BrowserWindow {
  if (state.eod && !state.eod.isDestroyed()) {
    state.eod.show();
    state.eod.focus();
    return state.eod;
  }
  const win = createWindow({
    kind: "eod",
    width: 520,
    height: 540,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    title: "End of day",
  });
  win.on("closed", () => {
    state.eod = null;
  });
  state.eod = win;
  return win;
}

export function closeEod(): void {
  const w = state.eod;
  if (w && !w.isDestroyed()) w.close();
}
