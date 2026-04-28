import type { BrowserWindow } from "electron";
import { APP_NAME } from "@shared/constants";
import { createWindow } from "./factory";
import { state } from "./registry";
import { attachBoundsPersistence, restoreBounds } from "./persistedBounds";

const DEFAULT_BOUNDS = { width: 980, height: 760 };

export function ensureDashboard(): BrowserWindow {
  if (state.dashboard && !state.dashboard.isDestroyed()) return state.dashboard;
  const restored = restoreBounds("dashboard", DEFAULT_BOUNDS);
  const win = createWindow({
    kind: "dashboard",
    width: restored.width,
    height: restored.height,
    x: restored.x,
    y: restored.y,
    // Round 4 minimums: dashboard >= 720x560, no max.
    minWidth: 720,
    minHeight: 560,
    frame: false,
    transparent: false,
    resizable: true,
    title: `${APP_NAME} · Dashboard`,
  });
  if (restored.maximized) win.maximize();
  attachBoundsPersistence(win, "dashboard");
  win.on("closed", () => {
    state.dashboard = null;
  });
  state.dashboard = win;
  return win;
}
