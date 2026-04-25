import type { BrowserWindow } from "electron";
import { createWindow } from "./factory";
import { state } from "./registry";

export function ensureCheatsheet(): BrowserWindow {
  if (state.cheatsheet && !state.cheatsheet.isDestroyed()) {
    state.cheatsheet.show();
    state.cheatsheet.focus();
    return state.cheatsheet;
  }
  const win = createWindow({
    kind: "cheatsheet",
    width: 480,
    height: 520,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    title: "Shortcuts",
  });
  win.on("closed", () => {
    state.cheatsheet = null;
  });
  state.cheatsheet = win;
  return win;
}
