import type { BrowserWindow } from "electron";
import type { SettingsSectionId } from "@shared/schemas";
import { broadcast } from "../ipc/events";
import { createWindow } from "./factory";
import { state } from "./registry";
import { attachBoundsPersistence, restoreBounds } from "./persistedBounds";

const DEFAULT_BOUNDS = { width: 640, height: 640 };

export function ensureSettings(
  opts: { section?: SettingsSectionId } = {},
): BrowserWindow {
  const section = opts.section ?? "general";
  if (state.settings && !state.settings.isDestroyed()) {
    state.settings.show();
    state.settings.focus();
    // Window already open — push the desired section so the renderer can navigate.
    broadcast("settings:section", section);
    return state.settings;
  }
  const restored = restoreBounds("settings", DEFAULT_BOUNDS);
  const win = createWindow({
    kind: "settings",
    width: restored.width,
    height: restored.height,
    x: restored.x,
    y: restored.y,
    // Round 4 minimums: settings >= 480x520, no max.
    minWidth: 480,
    minHeight: 520,
    frame: false,
    transparent: false,
    resizable: true,
    title: "Settings",
    search: { section },
  });
  if (restored.maximized) win.maximize();
  attachBoundsPersistence(win, "settings");
  win.on("closed", () => {
    state.settings = null;
  });
  state.settings = win;
  return win;
}
