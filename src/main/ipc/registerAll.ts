/**
 * Single entrypoint that wires every IPC handler.
 *
 * Each register* function lives in its own file, grouped by domain. The
 * handler files only import `register` from `./handlers`; they don't know
 * about each other. To add a new channel: pick the right file, register the
 * handler, done.
 */
import { registerBootstrap } from "./bootstrap";
import { registerTimer } from "./timer";
import { registerCaptures } from "./captures";
import { registerSettings } from "./settings";
import { registerNudges } from "./nudges";
import { registerExports } from "./exports";
import { registerWindows } from "./windows";

export function registerAll(): void {
  registerBootstrap();
  registerTimer();
  registerCaptures();
  registerSettings();
  registerNudges();
  registerExports();
  registerWindows();
}
