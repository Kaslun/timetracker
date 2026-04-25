/**
 * Public window manager surface.
 *
 * Each window kind gets its own file under `src/main/windows/`. This module
 * is just a re-export hub so the rest of the main process can do
 *
 *   import { ensurePill, toggleExpanded, spawnToast } from './windows/manager';
 *
 * without caring how the modules are split internally.
 */

export {
  ensurePill,
  pillResize,
  setPillPosition,
  showPill,
  hidePill,
  togglePill,
  attachDisplayWatcher,
  applyPillSettings,
} from "./pill";
export { ensureExpanded, toggleExpanded, isExpandedVisible } from "./expanded";
export { ensureDashboard } from "./dashboard";
export { ensureIntro, closeIntro } from "./intro";
export { ensureSettings } from "./settings";
export { ensureCheatsheet } from "./cheatsheet";
export { spawnToast, closeToast } from "./toast";
export { ensureIntegration } from "./integration";
export { listAllWindows, getWindow, type SingletonKind } from "./registry";
