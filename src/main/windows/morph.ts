/**
 * Pill ↔ expanded morph.
 *
 * The pill and the "expanded" view live in the same Electron BrowserWindow.
 * When the user toggles the expanded view we don't open a second window —
 * we animate the pill window's bounds from pill to expanded dimensions and
 * tell the renderer to swap content. The pill's `mode` Zustand state is the
 * source of truth on the renderer; this module is the source of truth on
 * the main side.
 *
 * Anchoring rules: the expanded view grows from the pill's current corner.
 * If the pill is closer to the right/bottom of its display than to the
 * left/top, the expanded view extends up/left to stay on screen. If both
 * directions are tight (small displays), we clamp into the work area.
 *
 * This module is intentionally framework-free: stepped `setBounds` calls in a
 * `setInterval` loop. We tried `BrowserWindow.setBounds(..., true)` (animated
 * by Electron on macOS only) but it's not consistent across platforms.
 */
import { screen } from "electron";
import { EXPANDED, MORPH, PILL } from "@shared/constants";
import { broadcast } from "../ipc/events";
import { state } from "./registry";

type Mode = "pill" | "expanded";

interface MorphState {
  mode: Mode;
  /** When in expanded mode, the pill's last bounds — restored on collapse. */
  lastPillBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  /** Active animation timer, so we can cancel a counter-toggle mid-flight. */
  timer: NodeJS.Timeout | null;
}

const morph: MorphState = {
  mode: "pill",
  lastPillBounds: null,
  timer: null,
};

export function getMode(): Mode {
  return morph.mode;
}

export function isExpanded(): boolean {
  return morph.mode === "expanded";
}

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Compute expanded bounds anchored to the pill's current corner.
 *
 * If the pill is in the right half of the display, grow leftward; otherwise
 * grow rightward. Same logic vertically. Final bounds are clamped to the
 * work area so we never paint off-screen.
 */
function expandedBoundsFromPill(pill: Bounds): Bounds {
  const display = screen.getDisplayNearestPoint({
    x: pill.x + pill.width / 2,
    y: pill.y + pill.height / 2,
  });
  const { workArea } = display;

  const pillCenterX = pill.x + pill.width / 2;
  const pillCenterY = pill.y + pill.height / 2;
  const workCenterX = workArea.x + workArea.width / 2;
  const workCenterY = workArea.y + workArea.height / 2;

  const growRight = pillCenterX < workCenterX;
  const growDown = pillCenterY < workCenterY;

  let x = growRight ? pill.x : pill.x + pill.width - EXPANDED.width;
  let y = growDown ? pill.y : pill.y + pill.height - EXPANDED.height;

  x = Math.max(
    workArea.x,
    Math.min(x, workArea.x + workArea.width - EXPANDED.width),
  );
  y = Math.max(
    workArea.y,
    Math.min(y, workArea.y + workArea.height - EXPANDED.height),
  );

  return { x, y, width: EXPANDED.width, height: EXPANDED.height };
}

/**
 * Step linearly between two bounds across N frames spaced over `MORPH.durationMs`.
 *
 * On the first frame the renderer's content has already started its crossfade
 * (we broadcast the new mode immediately), so the resize and the React swap
 * roughly run together. The motion library handles its own easing — we keep
 * the bounds interpolation linear so the chrome isn't double-eased.
 */
function animateBounds(
  win: Electron.BrowserWindow,
  from: Bounds,
  to: Bounds,
  onDone: () => void,
): void {
  if (morph.timer) clearInterval(morph.timer);

  const frames = MORPH.frames;
  const interval = Math.max(1, Math.round(MORPH.durationMs / frames));
  let i = 0;

  morph.timer = setInterval(() => {
    if (win.isDestroyed()) {
      if (morph.timer) clearInterval(morph.timer);
      morph.timer = null;
      return;
    }
    i += 1;
    const t = i / frames;
    const lerp = (a: number, b: number): number => Math.round(a + (b - a) * t);
    win.setBounds({
      x: lerp(from.x, to.x),
      y: lerp(from.y, to.y),
      width: lerp(from.width, to.width),
      height: lerp(from.height, to.height),
    });
    if (i >= frames) {
      if (morph.timer) clearInterval(morph.timer);
      morph.timer = null;
      win.setBounds(to);
      onDone();
    }
  }, interval);
}

function broadcastMode(): void {
  broadcast("pill:mode", { mode: morph.mode });
  // Existing event so anything listening to expand visibility keeps working.
  broadcast("expanded:state", { visible: morph.mode === "expanded" });
}

/**
 * Toggle between pill and expanded modes by morphing the pill window's
 * bounds and chrome. Always-on-top, taskbar visibility, resize-ability and
 * shadow are flipped together so the window behaves correctly in each mode.
 */
export function toggleMorph(opts?: { force?: Mode }): void {
  const win = state.pill;
  if (!win || win.isDestroyed()) return;
  const next: Mode =
    opts?.force ?? (morph.mode === "pill" ? "expanded" : "pill");
  if (next === morph.mode) return;

  if (next === "expanded") {
    const pillBounds = win.getBounds();
    morph.lastPillBounds = pillBounds;
    const target = expandedBoundsFromPill(pillBounds);

    win.setResizable(true);
    win.setMinimumSize(420, 520);
    win.setAlwaysOnTop(false);
    win.setHasShadow(true);

    morph.mode = "expanded";
    broadcastMode();
    animateBounds(win, pillBounds, target, () => {
      // Once expanded, focus to indicate active interaction surface.
      win.focus();
    });
  } else {
    const from = win.getBounds();
    const target = morph.lastPillBounds ?? {
      x: from.x,
      y: from.y,
      width: PILL.width,
      height: PILL.collapsedHeight,
    };

    morph.mode = "pill";
    broadcastMode();
    animateBounds(win, from, target, () => {
      win.setMinimumSize(PILL.width, PILL.collapsedHeight);
      win.setResizable(false);
      win.setAlwaysOnTop(true, "floating");
      win.setHasShadow(false);
    });
  }
}

/** Force-collapse to pill, used on app boot to make sure we start clean. */
export function resetToPill(): void {
  if (morph.mode === "pill") return;
  toggleMorph({ force: "pill" });
}
