import type { BrowserWindow } from "electron";
import { createWindow } from "./factory";
import { state } from "./registry";

export function ensureSettings(): BrowserWindow {
  if (state.settings && !state.settings.isDestroyed()) {
    state.settings.show();
    state.settings.focus();
    return state.settings;
  }
  const win = createWindow({
    kind: "settings",
    width: 560,
    height: 640,
    frame: false,
    transparent: false,
    resizable: true,
    title: "Settings",
  });
  win.on("closed", () => {
    state.settings = null;
  });
  state.settings = win;
  return win;
}
