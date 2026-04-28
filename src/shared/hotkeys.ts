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

export const SHORTCUT_KEYS = Object.keys(SHORTCUTS) as ShortcutKey[];

/**
 * Resolve the current binding for `key`, honouring user overrides from
 * settings (the renderer passes `settings.shortcutOverrides` in). Returns the
 * default `win` accelerator when no override is set.
 */
export function effectiveBinding(
  key: ShortcutKey,
  overrides: Record<string, { combo: string }> = {},
): string {
  const ov = overrides[key];
  return ov?.combo ?? SHORTCUTS[key].win;
}

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
  overrides: Record<string, { combo: string }> = {},
): string {
  const s = SHORTCUTS[key];
  if (s.scope !== "global") {
    throw new Error(`globalAccelerator() called on in-app shortcut: ${key}`);
  }
  const combo = effectiveBinding(key, overrides);
  return platform === "mac" ? combo.replace("Ctrl", "Cmd") : combo;
}

/** Map a `KeyboardEvent` to the in-app shortcut it should trigger, or null
 *  if no match. Honours user overrides (so a single-key in-app shortcut can
 *  be rebound to e.g. "Shift+S" or just "T"). Caller is responsible for
 *  ignoring inputs/textareas. */
export function matchInAppShortcut(
  e: KeyboardEvent,
  overrides: Record<string, { combo: string }> = {},
): ShortcutKey | null {
  const combo = comboFromEvent(e);
  if (!combo) return null;
  for (const k of SHORTCUT_KEYS) {
    const sc = SHORTCUTS[k];
    if (sc.scope !== "inapp") continue;
    if (effectiveBinding(k, overrides) === combo) return k;
  }
  return null;
}

/**
 * Convert a `KeyboardEvent` into our canonical combo string (e.g.
 * `"Ctrl+Shift+S"`, `"Space"`, `"/"`). Returns `null` when the event only
 * carries modifier keys with no main key — capture mode uses this to wait
 * for the main key.
 */
export function comboFromEvent(e: KeyboardEvent): string | null {
  const main = mainKeyName(e);
  if (!main) return null;
  const mods: string[] = [];
  if (e.ctrlKey) mods.push("Ctrl");
  if (e.shiftKey) mods.push("Shift");
  if (e.altKey) mods.push("Alt");
  if (e.metaKey) mods.push("Meta");
  return [...mods, main].join("+");
}

function mainKeyName(e: KeyboardEvent): string | null {
  if (e.key === "Control" || e.key === "Shift" || e.key === "Alt" || e.key === "Meta") {
    return null;
  }
  if (e.key === " ") return "Space";
  if (e.key.length === 1) return e.key.toUpperCase();
  return e.key; // ArrowLeft, F1, Tab, /
}

/**
 * Combos the OS / Electron reserves and we should never let the user bind.
 * Stored in canonical (`Ctrl+Shift+Foo`) form so they can be compared
 * directly against `comboFromEvent` output.
 */
const OS_RESERVED = new Set<string>([
  "Ctrl+Alt+Delete",
  "Meta+L", // Win+L (lock)
  "Alt+F4",
  "Alt+Tab",
  "Ctrl+Alt+Tab",
  "Meta+Tab",
  "Meta+D", // Win+D (show desktop)
  "Meta+E",
  "Meta+R",
  "Meta+Space",
  "F11",
  "Meta+Shift+S",
]);

export interface ValidationResult {
  ok: boolean;
  reason?: string;
  conflict?: { key: ShortcutKey; combo: string };
}

/**
 * Validate a candidate combo for the given shortcut key.
 *
 * Rules:
 *   - Globals must include `Ctrl` (or `Meta` on mac) and at least one main
 *     key. Single-key globals would steal text input system-wide.
 *   - In-app shortcuts can be bare keys.
 *   - OS-reserved combos are rejected with a clear message.
 *   - Conflicts with another bound shortcut return the conflicting key so
 *     the UI can offer a swap.
 */
export function validateBinding(
  key: ShortcutKey,
  combo: string,
  overrides: Record<string, { combo: string }>,
): ValidationResult {
  const sc = SHORTCUTS[key];
  if (!combo) return { ok: false, reason: "Press a key to assign." };

  if (OS_RESERVED.has(combo)) {
    return { ok: false, reason: `${combo} is reserved by the operating system.` };
  }

  if (sc.scope === "global") {
    const parts = combo.split("+");
    const hasModifier = parts.some(
      (p) => p === "Ctrl" || p === "Meta" || p === "Shift" || p === "Alt",
    );
    const hasNonShiftAccelerator = parts.some(
      (p) => p === "Ctrl" || p === "Meta",
    );
    if (!hasModifier || !hasNonShiftAccelerator || parts.length < 2) {
      return {
        ok: false,
        reason: "Global shortcuts must include Ctrl (or Cmd) and a main key.",
      };
    }
  }

  for (const k of SHORTCUT_KEYS) {
    if (k === key) continue;
    if (effectiveBinding(k, overrides) === combo) {
      return {
        ok: false,
        reason: `Already bound to ${SHORTCUTS[k].label}.`,
        conflict: { key: k, combo },
      };
    }
  }

  return { ok: true };
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
