import type { BrowserWindow } from "electron";
import { createWindow } from "./factory";
import { state } from "./registry";

export function ensureIntro(): BrowserWindow {
  if (state.intro && !state.intro.isDestroyed()) return state.intro;
  const win = createWindow({
    kind: "intro",
    width: 540,
    height: 660,
    frame: false,
    transparent: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    title: "Welcome",
  });
  win.on("closed", () => {
    state.intro = null;
  });
  state.intro = win;
  return win;
}

export function closeIntro(): void {
  if (state.intro && !state.intro.isDestroyed()) {
    state.intro.close();
    state.intro = null;
  }
}
