import { globalShortcut } from "electron";
import { SHORTCUTS, type ShortcutKey } from "@shared/hotkeys";
import {
  ensureCheatsheet,
  ensurePill,
  toggleExpanded,
} from "../windows/manager";
import { broadcast } from "../ipc/events";
import { entries } from "../db/repos/entries";
import { tasks } from "../db/repos/tasks";
import { captures } from "../db/repos/captures";
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
    key: "switchTask",
    handler: () => {
      toggleExpanded({ alwaysShow: true });
      broadcast("expanded:tab", "list");
      broadcast("expanded:focus-search", undefined);
    },
  },
  {
    key: "expandWindow",
    handler: () => toggleExpanded(),
  },
  {
    key: "brainDump",
    handler: () => {
      const pill = ensurePill();
      if (!pill.isVisible()) pill.show();
      pill.focus();
      broadcast("pill:focus-dump", undefined);
    },
  },
  {
    key: "cheatsheet",
    handler: () => ensureCheatsheet(),
  },
];

export function registerGlobalShortcuts(): void {
  unregisterGlobalShortcuts();
  for (const b of BINDINGS) {
    const accel = SHORTCUTS[b.key].win;
    const ok = globalShortcut.register(accel, b.handler);
    if (!ok) log.warn(`failed to register ${accel} (${b.key})`);
  }
}

export function unregisterGlobalShortcuts(): void {
  globalShortcut.unregisterAll();
}

/** Used by the tray + menu so they show the same accelerator strings. */
export function shortcutAccelerator(key: ShortcutKey): string {
  return SHORTCUTS[key].win;
}
