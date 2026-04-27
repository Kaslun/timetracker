/**
 * Single focus-aware key handler used by the pill and expanded windows.
 *
 * Rules:
 *  • Only fires when an Attensi window has keyboard focus (browser dispatch
 *    handles that for us — events only arrive when the document is focused).
 *  • Suppresses *all* in-app keys when an editable element is focused so
 *    typing "space" inside the brain dump doesn't toggle the timer.
 *  • Modifier-prefixed keys are ignored — those are handled either by the
 *    main process global shortcuts or by per-component handlers (Esc).
 *
 * Each window passes its own action map. Unmapped keys silently no-op so
 * windows don't interfere with one another (e.g. the pill window doesn't
 * need to handle "/").
 */
import { useEffect } from "react";
import {
  matchInAppShortcut,
  isEditableTarget,
  type ShortcutKey,
} from "@shared/hotkeys";

type Action = () => void;
export type ShortcutMap = Partial<Record<ShortcutKey, Action>>;

export function useInAppShortcuts(map: ShortcutMap): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (isEditableTarget(e.target)) return;
      const key = matchInAppShortcut(e);
      if (!key) return;
      const action = map[key];
      if (!action) return;
      e.preventDefault();
      action();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [map]);
}
