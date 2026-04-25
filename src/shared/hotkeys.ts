/**
 * Single source of truth for keyboard shortcuts.
 *
 * Keep this list short and verb-led (start, switch, expand, dump, show).
 * Every shortcut here is registered globally by the main process AND surfaced
 * in the cheatsheet UI; if you add one, both paths pick it up automatically.
 */

export type Platform = "win" | "mac" | "linux";

export function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "win";
  const p = navigator.platform.toLowerCase();
  if (p.includes("mac")) return "mac";
  if (p.includes("linux")) return "linux";
  return "win";
}

interface Shortcut {
  /** Mac glyph form, e.g. "⌘ ⇧ ␣" — for display when navigator.platform is mac. */
  mac: string;
  /** Windows accelerator string, e.g. "Ctrl+Shift+Space" — also used for Electron's globalShortcut. */
  win: string;
  /** Short imperative label for the cheatsheet. */
  label: string;
}

export const SHORTCUTS = {
  toggleTimer: { mac: "⌘ ␣", win: "Ctrl+Space", label: "Start / pause" },
  switchTask: { mac: "⌘ ⇧ ␣", win: "Ctrl+Shift+Space", label: "Switch task" },
  expandWindow: { mac: "⌘ E", win: "Ctrl+E", label: "Expand / collapse" },
  brainDump: { mac: "⌘ B", win: "Ctrl+B", label: "Brain dump" },
  cheatsheet: { mac: "⌘ /", win: "Ctrl+/", label: "Show shortcuts" },
} as const satisfies Record<string, Shortcut>;

export type ShortcutKey = keyof typeof SHORTCUTS;

/** Display label, platform-aware. */
export function shortcutLabel(
  key: ShortcutKey,
  platform: Platform = detectPlatform(),
): string {
  const s = SHORTCUTS[key];
  return platform === "mac" ? s.mac : s.win;
}

/** Electron globalShortcut accelerator. Maps Ctrl→Cmd on mac. */
export function globalAccelerator(
  key: ShortcutKey,
  platform: Platform = "win",
): string {
  const s = SHORTCUTS[key];
  return platform === "mac" ? s.win.replace("Ctrl", "Cmd") : s.win;
}
