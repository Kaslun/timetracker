import { afterEach, describe, expect, it, vi } from "vitest";
import {
  detectPlatform,
  globalAccelerator,
  SHORTCUTS,
  shortcutLabel,
  type ShortcutKey,
} from "../../src/shared/hotkeys";

describe("SHORTCUTS", () => {
  it("exposes exactly the five canonical actions", () => {
    expect(Object.keys(SHORTCUTS).sort()).toEqual([
      "brainDump",
      "cheatsheet",
      "expandWindow",
      "switchTask",
      "toggleTimer",
    ]);
  });

  it("every entry has a mac, win and label string", () => {
    for (const key of Object.keys(SHORTCUTS) as ShortcutKey[]) {
      const s = SHORTCUTS[key];
      expect(typeof s.mac).toBe("string");
      expect(typeof s.win).toBe("string");
      expect(typeof s.label).toBe("string");
      expect(s.win.length).toBeGreaterThan(0);
    }
  });

  it('Windows accelerators use "Ctrl"', () => {
    for (const key of Object.keys(SHORTCUTS) as ShortcutKey[]) {
      expect(SHORTCUTS[key].win.startsWith("Ctrl")).toBe(true);
    }
  });
});

describe("shortcutLabel", () => {
  it("returns the win label by default on non-mac platforms", () => {
    expect(shortcutLabel("toggleTimer", "win")).toBe("Ctrl+Space");
    expect(shortcutLabel("cheatsheet", "win")).toBe("Ctrl+/");
  });
  it("returns the mac glyph form on mac", () => {
    expect(shortcutLabel("toggleTimer", "mac")).toBe("⌘ ␣");
    expect(shortcutLabel("switchTask", "mac")).toBe("⌘ ⇧ ␣");
  });
});

describe("globalAccelerator", () => {
  it("maps Ctrl to Cmd on mac", () => {
    expect(globalAccelerator("expandWindow", "mac")).toBe("Cmd+E");
    expect(globalAccelerator("switchTask", "mac")).toBe("Cmd+Shift+Space");
  });
  it("keeps Ctrl on win/linux", () => {
    expect(globalAccelerator("expandWindow", "win")).toBe("Ctrl+E");
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
