/**
 * While any input/textarea/contentEditable inside the active window has
 * focus, suspend Electron's globally-registered shortcuts (Ctrl+Space etc.).
 * On blur, re-register them.
 *
 * In-app, single-key shortcuts are already suppressed at the keydown layer
 * by `useInAppShortcuts` via `isEditableTarget`; this hook covers the global
 * accelerators that fire from the OS regardless of focus.
 */
import { useEffect } from "react";
import { isEditableTarget } from "@shared/hotkeys";
import { rpc } from "@/lib/api";

export function useSuppressShortcutsOnInput(): void {
  useEffect(() => {
    let suspended = false;

    const apply = (next: boolean): void => {
      if (next === suspended) return;
      suspended = next;
      void rpc("shortcuts:setSuspended", { suspended: next });
    };

    const onFocusIn = (e: FocusEvent): void => {
      if (isEditableTarget(e.target)) apply(true);
    };
    const onFocusOut = (e: FocusEvent): void => {
      if (!isEditableTarget(e.target)) return;
      // The next focus owner arrives in `relatedTarget` — if it's also
      // editable, stay suspended; otherwise resume.
      if (isEditableTarget(e.relatedTarget)) return;
      apply(false);
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      // Ensure shortcuts are re-enabled when the window unmounts.
      if (suspended) void rpc("shortcuts:setSuspended", { suspended: false });
    };
  }, []);
}
