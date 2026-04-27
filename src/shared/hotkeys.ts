/**
 * Single source of truth for keyboard shortcuts.
 *
 * Two scopes:
 *   • global  — modifier-prefixed accelerators registered via Electron's
 *               globalShortcut API. They fire even when the app is in the
 *               background. Keep this list short.
 *   • in-app  — single-key shortcuts that fire only when an Attensi window
 *               has focus AND the user isn't typing in an input/textarea.
 *               No modifier needed because text input is suppressed at the
 *               focus boundary, not at the key level.
 */

export type Platform = "win" | "mac" | "linux";
export type Scope = "global" | "inapp";

export function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "win";
  const p = navigator.platform.toLowerCase();
  if (p.includes("mac")) return "mac";
  if (p.includes("linux")) return "linux";
  return "win";
}

interface Shortcut {
  /** Mac glyph form, e.g. "⌘ ␣" — for display when navigator.platform is mac. */
  mac: string;
  /** Windows accelerator string. For globals this is a real accelerator
   *  ("Ctrl+Space"); for in-app it's a single key label ("Space"). */
  win: string;
  /** Short imperative label for the cheatsheet. */
  label: string;
  /** Where the shortcut is bound. */
  scope: Scope;
}

export const SHORTCUTS = {
  // ── Global (registered with Electron globalShortcut) ─────────────────
  toggleTimer: {
    mac: "⌘ ␣",
    win: "Ctrl+Space",
    label: "Start / pause (anywhere)",
    scope: "global",
  },
  brainDumpGlobal: {
    mac: "⌘ ⇧ B",
    win: "Ctrl+Shift+B",
    label: "Brain dump (anywhere)",
    scope: "global",
  },
  quitApp: {
    mac: "⌘ ⇧ Q",
    win: "Ctrl+Shift+Q",
    label: "Quit Attensi (anywhere)",
    scope: "global",
  },

  // ── In-app (single-key, ignored when inputs are focused) ─────────────
  toggleTimerLocal: {
    mac: "␣",
    win: "Space",
    label: "Start / pause",
    scope: "inapp",
  },
  switchTask: {
    mac: "S",
    win: "S",
    label: "Switch task",
    scope: "inapp",
  },
  expandWindow: {
    mac: "E",
    win: "E",
    label: "Expand / collapse",
    scope: "inapp",
  },
  brainDump: {
    mac: "B",
    win: "B",
    label: "Brain dump",
    scope: "inapp",
  },
  cheatsheet: {
    mac: "/",
    win: "/",
    label: "Show shortcuts",
    scope: "inapp",
  },
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

/** Electron globalShortcut accelerator. Maps Ctrl→Cmd on mac. Only valid for
 *  scope === "global". */
export function globalAccelerator(
  key: ShortcutKey,
  platform: Platform = "win",
): string {
  const s = SHORTCUTS[key];
  if (s.scope !== "global") {
    throw new Error(`globalAccelerator() called on in-app shortcut: ${key}`);
  }
  return platform === "mac" ? s.win.replace("Ctrl", "Cmd") : s.win;
}

/** Map a `KeyboardEvent` to the in-app shortcut it should trigger, or null
 *  if no match. Modifiers are explicitly disallowed (single-key only).
 *  Caller is responsible for ignoring inputs/textareas. */
export function matchInAppShortcut(e: KeyboardEvent): ShortcutKey | null {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  const map: Record<string, ShortcutKey> = {
    " ": "toggleTimerLocal",
    s: "switchTask",
    e: "expandWindow",
    b: "brainDump",
    "/": "cheatsheet",
  };
  const hit = map[e.key.toLowerCase()];
  return hit ?? null;
}

export function isEditableTarget(t: EventTarget | null): boolean {
  if (!t) return false;
  // Guard the DOM lookups so this module remains importable from a pure-node
  // unit test environment where `HTMLElement` & co. don't exist.
  const g = globalThis as {
    HTMLElement?: typeof HTMLElement;
    HTMLInputElement?: typeof HTMLInputElement;
    HTMLTextAreaElement?: typeof HTMLTextAreaElement;
  };
  if (!g.HTMLElement) return false;
  if (!(t instanceof g.HTMLElement)) return false;
  if (g.HTMLInputElement && t instanceof g.HTMLInputElement) return true;
  if (g.HTMLTextAreaElement && t instanceof g.HTMLTextAreaElement) return true;
  if ((t as HTMLElement).isContentEditable) return true;
  return false;
}
