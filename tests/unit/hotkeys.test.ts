import { afterEach, describe, expect, it, vi } from "vitest";
import {
  detectPlatform,
  globalAccelerator,
  isEditableTarget,
  matchInAppShortcut,
  SHORTCUTS,
  shortcutLabel,
  type ShortcutKey,
} from "../../src/shared/hotkeys";

describe("SHORTCUTS", () => {
  it("splits into 2 global + 5 in-app actions", () => {
    const all = Object.keys(SHORTCUTS).sort();
    expect(all).toEqual(
      [
        "brainDump",
        "brainDumpGlobal",
        "cheatsheet",
        "expandWindow",
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
    expect(globals.sort()).toEqual(["brainDumpGlobal", "toggleTimer"].sort());
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
