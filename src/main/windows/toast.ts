import { type BrowserWindow, screen } from "electron";
import { APP_NAME, type ToastKind } from "@shared/constants";
import { createWindow } from "./factory";
import { state } from "./registry";

const TOAST_DIMENSIONS: Record<ToastKind, { w: number; h: number }> = {
  slack: { w: 360, h: 110 },
  teams: { w: 360, h: 110 },
  idle_recover: { w: 360, h: 280 },
  retro_fill: { w: 380, h: 380 },
};

const EDGE = 16;

export function spawnToast(kind: ToastKind): BrowserWindow {
  const existing = state.toasts.get(kind);
  if (existing && !existing.isDestroyed()) {
    existing.show();
    existing.focus();
    return existing;
  }
  const dims = TOAST_DIMENSIONS[kind];
  const display = screen.getPrimaryDisplay();
  const wa = display.workArea;
  const win = createWindow({
    kind: "toast",
    width: dims.w,
    height: dims.h,
    x: wa.x + wa.width - dims.w - EDGE,
    y: wa.y + wa.height - dims.h - EDGE,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: true,
    title: `${APP_NAME} · ${kind}`,
    search: { toast: kind },
  });
  win.on("closed", () => {
    state.toasts.delete(kind);
  });
  state.toasts.set(kind, win);
  return win;
}

export function closeToast(kind: ToastKind): void {
  const w = state.toasts.get(kind);
  if (w && !w.isDestroyed()) w.close();
}
