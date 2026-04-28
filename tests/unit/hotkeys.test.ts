import { afterEach, describe, expect, it, vi } from "vitest";
import {
  comboFromEvent,
  detectPlatform,
  effectiveBinding,
  globalAccelerator,
  isEditableTarget,
  matchInAppShortcut,
  SHORTCUT_KEYS,
  SHORTCUTS,
  shortcutLabel,
  validateBinding,
  type ShortcutKey,
} from "../../src/shared/hotkeys";

describe("SHORTCUTS", () => {
  it("splits into 3 global + 5 in-app actions", () => {
    const all = Object.keys(SHORTCUTS).sort();
    expect(all).toEqual(
      [
        "brainDump",
        "brainDumpGlobal",
        "cheatsheet",
        "expandWindow",
        "quitApp",
        "switchTask",
        "toggleTimer",
        "toggleTimerLocal",
      ].sort(),
    );
    const globals = (Object.keys(SHORTCUTS) as ShortcutKey[]).filter(
      (k) => SHORTCUTS[k].scope === "global",
    );
    const inapp = (Object.keys(SHORTCUTS) as ShortcutKey[]).filter(
      (k) => SHORTCUTS[k].scope === "inapp",
    );
    expect(globals.sort()).toEqual(
      ["brainDumpGlobal", "quitApp", "toggleTimer"].sort(),
    );
    expect(inapp.length).toBe(5);
  });

  it("every entry has a mac, win, label and scope", () => {
    for (const key of Object.keys(SHORTCUTS) as ShortcutKey[]) {
      const s = SHORTCUTS[key];
      expect(typeof s.mac).toBe("string");
      expect(typeof s.win).toBe("string");
      expect(typeof s.label).toBe("string");
      expect(s.win.length).toBeGreaterThan(0);
      expect(["global", "inapp"]).toContain(s.scope);
    }
  });

  it("global accelerators use Ctrl, in-app are bare keys", () => {
    for (const key of Object.keys(SHORTCUTS) as ShortcutKey[]) {
      const s = SHORTCUTS[key];
      if (s.scope === "global") {
        expect(s.win.startsWith("Ctrl")).toBe(true);
      } else {
        expect(s.win.includes("Ctrl")).toBe(false);
      }
    }
  });
});

describe("shortcutLabel", () => {
  it("returns the win label by default on non-mac platforms", () => {
    expect(shortcutLabel("toggleTimer", "win")).toBe("Ctrl+Space");
    expect(shortcutLabel("cheatsheet", "win")).toBe("/");
  });
  it("returns the mac glyph form on mac", () => {
    expect(shortcutLabel("toggleTimer", "mac")).toBe("⌘ ␣");
    expect(shortcutLabel("brainDumpGlobal", "mac")).toBe("⌘ ⇧ B");
  });
});

describe("globalAccelerator", () => {
  it("maps Ctrl to Cmd on mac for global shortcuts", () => {
    expect(globalAccelerator("toggleTimer", "mac")).toBe("Cmd+Space");
    expect(globalAccelerator("brainDumpGlobal", "mac")).toBe("Cmd+Shift+B");
  });
  it("keeps Ctrl on win/linux for global shortcuts", () => {
    expect(globalAccelerator("toggleTimer", "win")).toBe("Ctrl+Space");
  });
  it("throws when called on an in-app shortcut", () => {
    expect(() => globalAccelerator("expandWindow", "win")).toThrow();
  });
});

describe("matchInAppShortcut", () => {
  // Tests run in a node environment, so use a plain object cast to the
  // shape `matchInAppShortcut` reads. This avoids needing jsdom.
  const ev = (init: {
    key: string;
    ctrlKey?: boolean;
    metaKey?: boolean;
    altKey?: boolean;
  }): KeyboardEvent =>
    ({
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      ...init,
    }) as KeyboardEvent;

  it("matches plain single keys", () => {
    expect(matchInAppShortcut(ev({ key: " " }))).toBe("toggleTimerLocal");
    expect(matchInAppShortcut(ev({ key: "S" }))).toBe("switchTask");
    expect(matchInAppShortcut(ev({ key: "/" }))).toBe("cheatsheet");
  });

  it("ignores modifier-prefixed keys (those go through globalShortcut)", () => {
    expect(matchInAppShortcut(ev({ key: "S", ctrlKey: true }))).toBeNull();
    expect(matchInAppShortcut(ev({ key: " ", metaKey: true }))).toBeNull();
  });

  it("returns null on unmapped keys", () => {
    expect(matchInAppShortcut(ev({ key: "x" }))).toBeNull();
  });
});

describe("isEditableTarget", () => {
  // Tests run in a node env where `HTMLElement` & co. are undefined, so the
  // function falls through its existence-guard and returns false. To exercise
  // the DOM-present branches (lines 135-139 in src/shared/hotkeys.ts) we stub
  // those globals with minimal classes whose `instanceof` semantics are
  // checkable.

  class FakeHTMLElement {
    isContentEditable = false;
  }
  class FakeHTMLInputElement extends FakeHTMLElement {}
  class FakeHTMLTextAreaElement extends FakeHTMLElement {}

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false on null and on plain objects", () => {
    expect(isEditableTarget(null)).toBe(false);
    expect(isEditableTarget({} as EventTarget)).toBe(false);
  });

  it("returns false when HTMLElement is unavailable (node env)", () => {
    expect(
      isEditableTarget({ tagName: "INPUT" } as unknown as EventTarget),
    ).toBe(false);
  });

  it("recognises HTMLInputElement when the global is present", () => {
    vi.stubGlobal("HTMLElement", FakeHTMLElement);
    vi.stubGlobal("HTMLInputElement", FakeHTMLInputElement);
    vi.stubGlobal("HTMLTextAreaElement", FakeHTMLTextAreaElement);
    const target = new FakeHTMLInputElement() as unknown as EventTarget;
    expect(isEditableTarget(target)).toBe(true);
  });

  it("recognises HTMLTextAreaElement when the global is present", () => {
    vi.stubGlobal("HTMLElement", FakeHTMLElement);
    vi.stubGlobal("HTMLInputElement", FakeHTMLInputElement);
    vi.stubGlobal("HTMLTextAreaElement", FakeHTMLTextAreaElement);
    const target = new FakeHTMLTextAreaElement() as unknown as EventTarget;
    expect(isEditableTarget(target)).toBe(true);
  });

  it("recognises contentEditable elements", () => {
    vi.stubGlobal("HTMLElement", FakeHTMLElement);
    const div = new FakeHTMLElement();
    div.isContentEditable = true;
    expect(isEditableTarget(div as unknown as EventTarget)).toBe(true);
  });

  it("returns false for non-editable HTMLElements", () => {
    vi.stubGlobal("HTMLElement", FakeHTMLElement);
    const div = new FakeHTMLElement();
    expect(isEditableTarget(div as unknown as EventTarget)).toBe(false);
  });

  it("returns false when target isn't an HTMLElement instance", () => {
    vi.stubGlobal("HTMLElement", FakeHTMLElement);
    expect(isEditableTarget({ foo: "bar" } as unknown as EventTarget)).toBe(
      false,
    );
  });
});

describe("detectPlatform", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns 'win' when navigator is undefined (Node environment)", () => {
    expect(detectPlatform()).toBe("win");
  });

  it("returns 'mac' for a mac platform string", () => {
    vi.stubGlobal("navigator", { platform: "MacIntel" });
    expect(detectPlatform()).toBe("mac");
  });

  it("returns 'linux' for a linux platform string", () => {
    vi.stubGlobal("navigator", { platform: "Linux x86_64" });
    expect(detectPlatform()).toBe("linux");
  });

  it("returns 'win' for a Win32 platform string", () => {
    vi.stubGlobal("navigator", { platform: "Win32" });
    expect(detectPlatform()).toBe("win");
  });
});

// ---- Round-4 editable shortcuts -----------------------------------------

const ev = (init: {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}): KeyboardEvent =>
  ({
    ctrlKey: false,
    shiftKey: false,
    metaKey: false,
    altKey: false,
    ...init,
  }) as KeyboardEvent;

describe("SHORTCUT_KEYS", () => {
  it("enumerates every entry in SHORTCUTS", () => {
    expect(SHORTCUT_KEYS.sort()).toEqual(Object.keys(SHORTCUTS).sort());
  });
});

describe("effectiveBinding", () => {
  it("returns the default win accelerator when no override exists", () => {
    expect(effectiveBinding("toggleTimer")).toBe("Ctrl+Space");
    expect(effectiveBinding("switchTask", {})).toBe("S");
  });

  it("returns the override combo when one is set for that key", () => {
    expect(
      effectiveBinding("toggleTimer", { toggleTimer: { combo: "Ctrl+T" } }),
    ).toBe("Ctrl+T");
  });

  it("ignores overrides for unrelated keys", () => {
    expect(
      effectiveBinding("toggleTimer", { switchTask: { combo: "T" } }),
    ).toBe("Ctrl+Space");
  });
});

describe("comboFromEvent", () => {
  it("returns null for modifier-only events (capture mode keeps waiting)", () => {
    expect(comboFromEvent(ev({ key: "Control" }))).toBeNull();
    expect(comboFromEvent(ev({ key: "Shift" }))).toBeNull();
    expect(comboFromEvent(ev({ key: "Alt" }))).toBeNull();
    expect(comboFromEvent(ev({ key: "Meta" }))).toBeNull();
  });

  it("upper-cases single-letter keys", () => {
    expect(comboFromEvent(ev({ key: "s" }))).toBe("S");
    expect(comboFromEvent(ev({ key: "B", ctrlKey: true }))).toBe("Ctrl+B");
  });

  it("renders space as 'Space'", () => {
    expect(comboFromEvent(ev({ key: " ", ctrlKey: true }))).toBe("Ctrl+Space");
    expect(comboFromEvent(ev({ key: " " }))).toBe("Space");
  });

  it("preserves named keys verbatim (ArrowLeft, F1, /, Tab)", () => {
    expect(comboFromEvent(ev({ key: "ArrowLeft" }))).toBe("ArrowLeft");
    expect(comboFromEvent(ev({ key: "F1" }))).toBe("F1");
    expect(comboFromEvent(ev({ key: "/" }))).toBe("/");
    expect(comboFromEvent(ev({ key: "Tab", altKey: true }))).toBe("Alt+Tab");
  });

  it("orders modifiers Ctrl, Shift, Alt, Meta", () => {
    expect(
      comboFromEvent(
        ev({
          key: "S",
          ctrlKey: true,
          shiftKey: true,
          altKey: true,
          metaKey: true,
        }),
      ),
    ).toBe("Ctrl+Shift+Alt+Meta+S");
  });
});

describe("matchInAppShortcut with overrides", () => {
  it("respects an override that rebinds an in-app shortcut to a new key", () => {
    expect(
      matchInAppShortcut(ev({ key: "T" }), { switchTask: { combo: "T" } }),
    ).toBe("switchTask");
  });

  it("returns null for the now-unbound default key after an override", () => {
    expect(
      matchInAppShortcut(ev({ key: "S" }), { switchTask: { combo: "T" } }),
    ).toBeNull();
  });
});

describe("validateBinding", () => {
  it("rejects an empty combo with a 'press a key' prompt", () => {
    const r = validateBinding("toggleTimer", "", {});
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/press a key/i);
  });

  it("rejects OS-reserved combinations like Alt+F4 and Win+L", () => {
    expect(validateBinding("brainDumpGlobal", "Alt+F4", {}).ok).toBe(false);
    expect(validateBinding("brainDumpGlobal", "Meta+L", {}).ok).toBe(false);
    expect(validateBinding("brainDumpGlobal", "Ctrl+Alt+Delete", {}).ok).toBe(
      false,
    );
  });

  it("rejects single-key globals (would steal text input system-wide)", () => {
    const r = validateBinding("toggleTimer", "T", {});
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/global shortcuts must include ctrl/i);
  });

  it("rejects globals with only Shift (no Ctrl/Cmd)", () => {
    const r = validateBinding("toggleTimer", "Shift+T", {});
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/global shortcuts must include ctrl/i);
  });

  it("accepts a valid Ctrl+key global binding", () => {
    const r = validateBinding("toggleTimer", "Ctrl+T", {});
    expect(r.ok).toBe(true);
    expect(r.reason).toBeUndefined();
  });

  it("accepts a valid Ctrl+Shift+key global binding", () => {
    expect(validateBinding("brainDumpGlobal", "Ctrl+Shift+J", {}).ok).toBe(
      true,
    );
  });

  it("accepts bare-key in-app shortcuts", () => {
    expect(validateBinding("switchTask", "T", {}).ok).toBe(true);
    expect(validateBinding("brainDump", "Z", {}).ok).toBe(true);
  });

  it("flags conflicts with another bound shortcut and surfaces the conflict key", () => {
    const r = validateBinding("brainDumpGlobal", "Ctrl+Space", {});
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/already bound/i);
    expect(r.conflict?.key).toBe("toggleTimer");
    expect(r.conflict?.combo).toBe("Ctrl+Space");
  });

  it("recognises overridden bindings when checking conflicts", () => {
    const overrides = { switchTask: { combo: "T" } };
    const r = validateBinding("brainDump", "T", overrides);
    expect(r.ok).toBe(false);
    expect(r.conflict?.key).toBe("switchTask");
  });

  it("doesn't flag a key as conflicting with itself", () => {
    // Re-saving toggleTimer with its current binding is a no-op, not a
    // conflict — useful when the user opens edit mode then cancels.
    const r = validateBinding("toggleTimer", "Ctrl+Space", {});
    expect(r.ok).toBe(true);
  });
});

describe("matchInAppShortcut: defensive branches", () => {
  it("returns null when comboFromEvent yields null (modifier-only)", () => {
    expect(matchInAppShortcut(ev({ key: "Shift" }))).toBeNull();
  });
});
