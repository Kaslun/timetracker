/**
 * Convenience wrapper around the typed `broadcast` event publisher.
 *
 * Most write handlers want to push the same handful of "what's hot now"
 * collections to the renderer. Calling `broadcastChanges({ tasks: true })`
 * is shorter and harder to typo than `broadcast('tasks:changed', ...)`.
 */
import { entries, tasks, captures, settings } from "../db/repos";
import { broadcast } from "./events";

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

export interface ChangeFlags {
  current?: boolean;
  tasks?: boolean;
  entries?: boolean;
  captures?: boolean;
  settings?: boolean;
}

export function broadcastChanges(opts: ChangeFlags): void {
  if (opts.current) broadcast("current:changed", entries.currentView());
  if (opts.tasks) broadcast("tasks:changed", tasks.listWithStats());
  if (opts.entries) {
    const since = Date.now() - TWO_WEEKS_MS;
    broadcast("entries:changed", entries.list({ from: since }));
  }
  if (opts.captures) broadcast("captures:changed", captures.list());
  if (opts.settings) broadcast("settings:changed", settings.getAll());
}
