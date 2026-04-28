/**
 * Round-5 #8: shortcuts must be suppressed when typing in any input/textarea
 * (most importantly the pill brain-dump). The hook implementation lives in
 * `src/renderer/lib/useInAppShortcuts.ts` and delegates the editable check to
 * `isEditableTarget` from `src/shared/hotkeys.ts`. This test verifies the
 * delegation does the right thing when the focus is inside a textarea.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { isEditableTarget, matchInAppShortcut } from "../../src/shared/hotkeys";

class FakeHTMLElement {
  isContentEditable = false;
}
class FakeHTMLInputElement extends FakeHTMLElement {}
class FakeHTMLTextAreaElement extends FakeHTMLElement {}

const ev = (init: {
  key: string;
  target?: EventTarget;
  ctrlKey?: boolean;
  metaKey?: boolean;
}): KeyboardEvent =>
  ({
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    target: init.target ?? null,
    ...init,
  }) as unknown as KeyboardEvent;

describe("Round-5 #8: brain-dump suppresses in-app shortcuts", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("isEditableTarget returns true for a focused textarea (the brain-dump)", () => {
    vi.stubGlobal("HTMLElement", FakeHTMLElement);
    vi.stubGlobal("HTMLInputElement", FakeHTMLInputElement);
    vi.stubGlobal("HTMLTextAreaElement", FakeHTMLTextAreaElement);
    const textarea = new FakeHTMLTextAreaElement() as unknown as EventTarget;
    expect(isEditableTarget(textarea)).toBe(true);
  });

  it("a single-key shortcut would otherwise match — the suppression is the only thing protecting the brain dump", () => {
    // Sanity: without the editable guard, pressing 'B' (default brainDump key)
    // matches a real action. The hook in useInAppShortcuts.ts checks
    // isEditableTarget *first* and bails before this match runs.
    expect(matchInAppShortcut(ev({ key: "B" }))).toBe("brainDump");
    expect(matchInAppShortcut(ev({ key: " " }))).toBe("toggleTimerLocal");
    expect(matchInAppShortcut(ev({ key: "S" }))).toBe("switchTask");
    expect(matchInAppShortcut(ev({ key: "/" }))).toBe("cheatsheet");
  });

  it("global combos (Ctrl+Space, Ctrl+Shift+B) are still allowed inside an input — they go through globalShortcut, not this hook", () => {
    // matchInAppShortcut returns null for modifier-prefixed keys, so the
    // in-app handler doesn't fire either way. The OS-level globalShortcut
    // path runs in the main process and isn't affected by editable focus.
    expect(matchInAppShortcut(ev({ key: " ", ctrlKey: true }))).toBeNull();
    expect(matchInAppShortcut(ev({ key: "B", ctrlKey: true }))).toBeNull();
  });

  it("simulates the hook's gate: with an editable target, no action fires for any single key", () => {
    vi.stubGlobal("HTMLElement", FakeHTMLElement);
    vi.stubGlobal("HTMLInputElement", FakeHTMLInputElement);
    vi.stubGlobal("HTMLTextAreaElement", FakeHTMLTextAreaElement);
    const textarea = new FakeHTMLTextAreaElement() as unknown as EventTarget;

    // Re-implement the gate the hook applies. If isEditableTarget returns
    // true, matchInAppShortcut is never even invoked — no action dispatched.
    const dispatched: string[] = [];
    const fakeHandler = (e: KeyboardEvent): void => {
      if (isEditableTarget(e.target)) return;
      const key = matchInAppShortcut(e);
      if (key) dispatched.push(key);
    };

    // Each of these would dispatch its action on an empty-target event.
    fakeHandler(ev({ key: "b", target: textarea }));
    fakeHandler(ev({ key: " ", target: textarea }));
    fakeHandler(ev({ key: "S", target: textarea }));
    fakeHandler(ev({ key: "/", target: textarea }));

    expect(dispatched).toEqual([]);
  });

  it("the same keys *do* fire when the target is not editable", () => {
    vi.stubGlobal("HTMLElement", FakeHTMLElement);
    const div = new FakeHTMLElement() as unknown as EventTarget;
    const dispatched: string[] = [];
    const fakeHandler = (e: KeyboardEvent): void => {
      if (isEditableTarget(e.target)) return;
      const key = matchInAppShortcut(e);
      if (key) dispatched.push(key);
    };
    fakeHandler(ev({ key: "B", target: div }));
    fakeHandler(ev({ key: " ", target: div }));
    expect(dispatched).toEqual(["brainDump", "toggleTimerLocal"]);
  });
});
