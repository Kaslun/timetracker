import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as BrainDumpDraft from "../../src/renderer/lib/brainDumpDraft";

// Mock the renderer RPC bridge: api.ts looks up `window.attensi.invoke` at
// call time, which only exists inside a real Electron renderer. The brain
// dump module imports `rpc` from there, so we replace it with a spy we can
// assert on and control.
const rpc = vi.fn();
vi.mock("@/lib/api", () => ({ rpc }));

const KEY = "attensi.brainDumpDraft";

// Minimal Storage stand-in that mirrors the small surface area
// brainDumpDraft uses: getItem / setItem / removeItem.
class MemoryStorage {
  private store = new Map<string, string>();
  getItem = (k: string): string | null => this.store.get(k) ?? null;
  setItem = (k: string, v: string): void => {
    this.store.set(k, v);
  };
  removeItem = (k: string): void => {
    this.store.delete(k);
  };
}

let mod: typeof BrainDumpDraft;

beforeEach(async () => {
  rpc.mockReset();
  vi.stubGlobal("localStorage", new MemoryStorage());
  vi.resetModules();
  mod = await import("../../src/renderer/lib/brainDumpDraft");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("brainDumpDraft", () => {
  describe("getDraft", () => {
    it("returns an empty string when nothing is stored", () => {
      expect(mod.getDraft()).toBe("");
    });

    it("returns whatever setDraft persisted", () => {
      mod.setDraft("hello world");
      expect(mod.getDraft()).toBe("hello world");
    });

    it("returns '' when localStorage throws", () => {
      vi.stubGlobal("localStorage", {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {},
        removeItem: () => {},
      });
      expect(mod.getDraft()).toBe("");
    });
  });

  describe("setDraft", () => {
    it("removes the key when value is empty", () => {
      mod.setDraft("not empty");
      expect(mod.getDraft()).toBe("not empty");
      mod.setDraft("");
      expect(mod.getDraft()).toBe("");
    });

    it("swallows storage exceptions", () => {
      vi.stubGlobal("localStorage", {
        getItem: () => null,
        setItem: () => {
          throw new Error("quota");
        },
        removeItem: () => {
          throw new Error("quota");
        },
      });
      expect(() => mod.setDraft("x")).not.toThrow();
      expect(() => mod.setDraft("")).not.toThrow();
    });
  });

  describe("clearDraft", () => {
    it("wipes the stored value", () => {
      mod.setDraft("scratch");
      mod.clearDraft();
      expect(mod.getDraft()).toBe("");
    });

    it("swallows storage exceptions", () => {
      vi.stubGlobal("localStorage", {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {
          throw new Error("blocked");
        },
      });
      expect(() => mod.clearDraft()).not.toThrow();
    });
  });

  describe("flushDraftAsCapture", () => {
    it("returns false and skips RPC when there's no draft", async () => {
      const ok = await mod.flushDraftAsCapture();
      expect(ok).toBe(false);
      expect(rpc).not.toHaveBeenCalled();
    });

    it("returns false when the draft is whitespace only", async () => {
      mod.setDraft("   \n\t");
      expect(await mod.flushDraftAsCapture()).toBe(false);
      expect(rpc).not.toHaveBeenCalled();
    });

    it("creates a 'draft'-tagged capture and clears the draft on success", async () => {
      rpc.mockResolvedValueOnce(undefined);
      mod.setDraft("  remember the milk  ");
      const ok = await mod.flushDraftAsCapture();
      expect(ok).toBe(true);
      expect(rpc).toHaveBeenCalledWith("capture:create", {
        text: "remember the milk",
        tag: "draft",
      });
      // Draft should be gone after a successful flush.
      expect(mod.getDraft()).toBe("");
    });

    it("preserves the draft when the RPC fails so a relaunch can recover", async () => {
      rpc.mockRejectedValueOnce(new Error("offline"));
      mod.setDraft("important");
      const ok = await mod.flushDraftAsCapture();
      expect(ok).toBe(false);
      expect(mod.getDraft()).toBe("important");
    });
  });

  describe("KEY constant", () => {
    it("uses a namespaced key so we don't collide with other apps", () => {
      mod.setDraft("test");
      // Read the raw underlying store via the same global to assert namespacing.
      expect(localStorage.getItem(KEY)).toBe("test");
    });
  });
});
