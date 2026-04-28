/**
 * Persist last window position + size per window kind across launches.
 *
 * Round 4 turned every non-pill window into a real resizable app surface.
 * Users expect their last layout to come back next time, including which
 * monitor it was on and whether it was maximized.
 *
 * Strategy:
 *   - On window creation, read the bounds back from `settings.windowBounds[id]`
 *     and apply them — clamped to a visible display so a window that was on
 *     a now-disconnected monitor still appears somewhere.
 *   - During the window's life, debounce-save bounds on `move`/`resize` and
 *     write the maximized flag on the matching events.
 *   - The pill window has its own per-display position store (`pillPositions`)
 *     and is intentionally *not* handled here — its size is fixed and its
 *     position model is multi-display.
 */
import type { BrowserWindow } from "electron";
import { screen } from "electron";
import type { WindowBounds } from "@shared/types";
import { settings as settingsRepo } from "../db/repos/settings";

type Kind = "expanded" | "dashboard" | "settings";

const SAVE_DEBOUNCE_MS = 250;

interface RestoreOpts {
  width: number;
  height: number;
}

interface Restored {
  width: number;
  height: number;
  x?: number;
  y?: number;
  maximized: boolean;
}

/**
 * Look up a saved bounds entry for the given window id and validate it
 * against the current display layout. If the saved position would land off
 * any visible screen we drop the position (Electron will center the window)
 * but keep the size, so users with a roving multi-monitor setup don't end up
 * with an invisible window.
 */
export function restoreBounds(id: Kind, opts: RestoreOpts): Restored {
  const cfg = settingsRepo.getAll();
  const saved = cfg.windowBounds[id] as WindowBounds | undefined;
  if (!saved) return { ...opts, maximized: false };
  const visible = isPositionVisible(saved.x, saved.y, saved.width, saved.height);
  return {
    width: Math.max(opts.width / 2, saved.width),
    height: Math.max(opts.height / 2, saved.height),
    x: visible ? saved.x : undefined,
    y: visible ? saved.y : undefined,
    maximized: saved.maximized,
  };
}

/**
 * Wire move/resize/maximize/unmaximize listeners onto the window so we save
 * its bounds back into the `settings.windowBounds` map. Saves are debounced
 * — Electron fires move events at the OS frame rate while dragging.
 */
export function attachBoundsPersistence(
  win: BrowserWindow,
  id: Kind,
): void {
  let timer: NodeJS.Timeout | null = null;
  const flush = (): void => {
    if (win.isDestroyed()) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (win.isDestroyed()) return;
      const bounds = win.getNormalBounds();
      const display = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
      const next: WindowBounds = {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        displayId: String(display.id),
        maximized: win.isMaximized(),
      };
      const cfg = settingsRepo.getAll();
      settingsRepo.patch({
        windowBounds: { ...cfg.windowBounds, [id]: next },
      });
    }, SAVE_DEBOUNCE_MS);
  };
  win.on("resize", flush);
  win.on("move", flush);
  win.on("maximize", flush);
  win.on("unmaximize", flush);
  win.on("close", () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    flush();
  });
}

function isPositionVisible(
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  const cx = x + w / 2;
  const cy = y + h / 2;
  return screen
    .getAllDisplays()
    .some(
      (d) =>
        cx >= d.workArea.x &&
        cx <= d.workArea.x + d.workArea.width &&
        cy >= d.workArea.y &&
        cy <= d.workArea.y + d.workArea.height,
    );
}
