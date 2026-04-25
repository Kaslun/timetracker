import type { BrowserWindow } from "electron";
import { APP_NAME } from "@shared/constants";
import { broadcast } from "../ipc/events";
import { createWindow } from "./factory";
import { state } from "./registry";

function broadcastExpandedState(): void {
  const win = state.expanded;
  const visible = !!win && !win.isDestroyed() && win.isVisible();
  broadcast("expanded:state", { visible });
}

export function ensureExpanded(): BrowserWindow {
  if (state.expanded && !state.expanded.isDestroyed()) return state.expanded;
  const win = createWindow({
    kind: "expanded",
    width: 460,
    height: 640,
    minWidth: 420,
    minHeight: 520,
    frame: false,
    transparent: false,
    title: APP_NAME,
  });
  win.on("closed", () => {
    state.expanded = null;
    broadcastExpandedState();
  });
  win.on("show", broadcastExpandedState);
  win.on("hide", broadcastExpandedState);
  state.expanded = win;
  return win;
}

/**
 * Toggle the expanded window.
 * - default: visible+focused → hide; otherwise show+focus.
 * - alwaysShow: never hide, just bring to front (used by switchTask which
 *   should always reveal the picker).
 */
export function toggleExpanded(opts?: { alwaysShow?: boolean }): void {
  const win = state.expanded;
  if (!win || win.isDestroyed()) {
    ensureExpanded();
    broadcastExpandedState();
    return;
  }
  if (!opts?.alwaysShow && win.isVisible() && win.isFocused()) {
    win.hide();
  } else {
    if (!win.isVisible()) win.show();
    win.focus();
  }
  broadcastExpandedState();
}

export function isExpandedVisible(): boolean {
  const win = state.expanded;
  return !!win && !win.isDestroyed() && win.isVisible();
}
