import type { BrowserWindow } from "electron";
import { APP_NAME } from "@shared/constants";
import { createWindow } from "./factory";
import { state } from "./registry";

export function ensureDashboard(): BrowserWindow {
  if (state.dashboard && !state.dashboard.isDestroyed()) return state.dashboard;
  const win = createWindow({
    kind: "dashboard",
    width: 980,
    height: 760,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    transparent: false,
    title: `${APP_NAME} · Dashboard`,
  });
  win.on("closed", () => {
    state.dashboard = null;
  });
  state.dashboard = win;
  return win;
}
