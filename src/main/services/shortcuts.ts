import { globalShortcut } from "electron";
import {
  SHORTCUTS,
  effectiveBinding,
  type ShortcutKey,
} from "@shared/hotkeys";
import { ensurePill } from "../windows/manager";
import { broadcast } from "../ipc/events";
import { entries } from "../db/repos/entries";
import { tasks } from "../db/repos/tasks";
import { captures } from "../db/repos/captures";
import { settings as settingsRepo } from "../db/repos/settings";
import { requestQuit } from "./quit";
import { logger } from "./logger";

const log = logger("shortcuts");

interface Binding {
  key: ShortcutKey;
  handler: () => void;
}

/** Re-broadcast all the hot collections after a write so every renderer updates. */
function broadcastChanges(): void {
  broadcast("current:changed", entries.currentView());
  broadcast("tasks:changed", tasks.listWithStats());
  const since = Date.now() - 14 * 24 * 60 * 60 * 1000;
  broadcast("entries:changed", entries.list({ from: since }));
  broadcast("captures:changed", captures.list());
}

/** Resume the most-touched task today (or the first task if today is empty). */
function startMostRecentTask(): void {
  const list = tasks.listWithStats();
  const target = list.find((t) => t.todaySec > 0) ?? list[0];
  if (target) entries.start({ taskId: target.id });
}

const BINDINGS: Binding[] = [
  {
    key: "toggleTimer",
    handler: () => {
      const cur = entries.open();
      if (cur) entries.pause();
      else startMostRecentTask();
      broadcastChanges();
    },
  },
  {
    key: "brainDumpGlobal",
    handler: () => {
      const pill = ensurePill();
      if (!pill.isVisible()) pill.show();
      pill.focus();
      broadcast("pill:focus-dump", undefined);
    },
  },
  {
    key: "quitApp",
    handler: () => {
      requestQuit();
    },
  },
];

let suspended = false;

export function registerGlobalShortcuts(): void {
  unregisterGlobalShortcuts();
  if (suspended) return;
  const overrides = settingsRepo.getAll().shortcutOverrides;
  for (const b of BINDINGS) {
    const sc = SHORTCUTS[b.key];
    if (sc.scope !== "global") continue;
    const accel = effectiveBinding(b.key, overrides);
    const ok = globalShortcut.register(accel, b.handler);
    if (!ok) log.warn(`failed to register ${accel} (${b.key})`);
  }
}

export function unregisterGlobalShortcuts(): void {
  globalShortcut.unregisterAll();
}

/**
 * Toggle whether global shortcuts are registered with the OS.
 *
 * The renderer calls this on input focus/blur so accelerators like Ctrl+Space
 * don't fire while the user is typing. Calls are idempotent.
 */
export function setShortcutsSuspended(next: boolean): void {
  if (suspended === next) return;
  suspended = next;
  if (next) unregisterGlobalShortcuts();
  else registerGlobalShortcuts();
}

/**
 * Re-register the global shortcuts table — call this whenever the user edits
 * the shortcut overrides via Settings so the new bindings take effect
 * immediately without a relaunch.
 */
export function reapplyGlobalShortcuts(): void {
  if (suspended) return;
  registerGlobalShortcuts();
}

/** Used by the tray + menu so they show the same accelerator strings. */
export function shortcutAccelerator(key: ShortcutKey): string {
  const overrides = settingsRepo.getAll().shortcutOverrides;
  return effectiveBinding(key, overrides);
}
