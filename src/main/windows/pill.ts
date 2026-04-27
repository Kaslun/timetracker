import { type BrowserWindow, screen } from "electron";
import { APP_NAME, PILL } from "@shared/constants";
import type { Settings } from "@shared/types";
import { settings as settingsRepo } from "../db/repos/settings";
import { createWindow } from "./factory";
import { state } from "./registry";
import { isExpanded } from "./morph";

function pickPillPosition(): { x: number; y: number; displayId: string } {
  const cfg = settingsRepo.getAll();
  const displays = screen.getAllDisplays();
  const lastId = cfg.pillLastDisplayId;
  const target =
    displays.find((d) => String(d.id) === lastId) ?? screen.getPrimaryDisplay();
  const targetId = String(target.id);
  const saved = cfg.pillPositions[targetId];
  if (saved) return { x: saved.x, y: saved.y, displayId: targetId };
  const { workArea } = target;
  return {
    x: workArea.x + workArea.width - PILL.width - PILL.edgeMargin,
    y: workArea.y + PILL.edgeMargin,
    displayId: targetId,
  };
}

export function ensurePill(): BrowserWindow {
  if (state.pill && !state.pill.isDestroyed()) return state.pill;
  const pos = pickPillPosition();

  const win = createWindow({
    kind: "pill",
    width: PILL.width,
    height: PILL.collapsedHeight,
    x: pos.x,
    y: pos.y,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: false,
    alwaysOnTop: true,
    hasShadow: false,
    focusable: true,
    title: APP_NAME,
  });
  win.setAlwaysOnTop(true, "floating");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });

  win.on("move", () => {
    if (win.isDestroyed()) return;
    const [x, y] = win.getPosition();
    const display = screen.getDisplayNearestPoint({ x, y });
    const displayId = String(display.id);
    const cfg = settingsRepo.getAll();
    settingsRepo.patch({
      pillPositions: { ...cfg.pillPositions, [displayId]: { x, y } },
      pillLastDisplayId: displayId,
    });
  });

  win.on("closed", () => {
    state.pill = null;
  });

  state.pill = win;
  return win;
}

export function pillResize(next: "collapsed" | "dump"): void {
  const win = state.pill;
  if (!win || win.isDestroyed()) return;
  // The brain-dump grow only applies in pill mode. In expanded mode the window
  // is already 460×640 and the brain dump is just inline content.
  if (isExpanded()) return;
  const target = next === "dump" ? PILL.dumpHeight : PILL.collapsedHeight;
  const [w] = win.getSize();
  win.setSize(w, target, true);
}

export function setPillPosition(displayId: string, x: number, y: number): void {
  const cfg = settingsRepo.getAll();
  settingsRepo.patch({
    pillPositions: { ...cfg.pillPositions, [displayId]: { x, y } },
    pillLastDisplayId: displayId,
  });
  const win = state.pill;
  if (win && !win.isDestroyed()) win.setPosition(x, y);
}

export function showPill(): void {
  const win = ensurePill();
  if (!win.isVisible()) win.show();
  settingsRepo.patch({ pillVisible: true });
}

export function hidePill(): void {
  const win = state.pill;
  if (!win || win.isDestroyed()) return;
  win.hide();
  settingsRepo.patch({ pillVisible: false });
}

export function togglePill(): void {
  const win = state.pill;
  if (!win || win.isDestroyed()) {
    showPill();
    return;
  }
  if (win.isVisible()) hidePill();
  else showPill();
}

/** Re-anchor the pill when the user adds / removes monitors. */
export function attachDisplayWatcher(): void {
  const reposition = (): void => {
    const win = state.pill;
    if (!win || win.isDestroyed()) return;
    const pos = pickPillPosition();
    win.setBounds({
      x: pos.x,
      y: pos.y,
      width: PILL.width,
      height: win.getBounds().height,
    });
  };
  screen.on("display-removed", reposition);
  screen.on("display-added", reposition);
  screen.on("display-metrics-changed", reposition);
}

/** Apply the given settings to the existing pill (visibility for now). */
export function applyPillSettings(s: Settings): void {
  if (!s.pillVisible) hidePill();
}
