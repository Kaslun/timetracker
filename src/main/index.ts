import { app, BrowserWindow } from "electron";
import { db } from "./db";
import { seedIfEmpty } from "./db/seed";
import { settings } from "./db/repos/settings";
import { attachHandlers } from "./ipc/handlers";
import { registerAll } from "./ipc/registerAll";
import {
  ensureIntro,
  ensurePill,
  attachDisplayWatcher,
} from "./windows/manager";
import { setAutoLaunch } from "./services/autolaunch";
import { startIdleService, stopIdleService } from "./services/idle";
import {
  registerGlobalShortcuts,
  unregisterGlobalShortcuts,
} from "./services/shortcuts";
import { createTray, destroyTray } from "./services/tray";
import { buildAppMenu } from "./services/menu";

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

app.on("second-instance", () => {
  // Bring the expanded window forward if running, else show pill
  const wins = BrowserWindow.getAllWindows();
  const focusable = wins.find((w) => !w.isDestroyed());
  focusable?.show();
  focusable?.focus();
});

app.whenReady().then(() => {
  // 1. Bring DB up + seed first run
  db();
  seedIfEmpty();

  // 2. Wire IPC
  registerAll();
  attachHandlers();

  // 3. Apply persisted auto-launch preference (defaults ON for first launch)
  const cfg = settings.getAll();
  setAutoLaunch(cfg.autoLaunch);

  // 4. Watch display add/remove for the pill
  attachDisplayWatcher();

  // 5. Start idle/retro polling + global shortcuts + tray + menu
  startIdleService();
  registerGlobalShortcuts();
  createTray();
  buildAppMenu();

  // 6. Decide initial windows based on first-run state
  if (!cfg.firstRunComplete) {
    ensureIntro();
  } else {
    ensurePill();
  }
});

app.on("will-quit", () => {
  unregisterGlobalShortcuts();
});

app.on("before-quit", () => {
  stopIdleService();
  destroyTray();
});

app.on("window-all-closed", () => {
  // On Windows, keep app alive in tray (todo: tray)
  // For now, quit when all windows close to avoid orphaned processes during dev.
  if (process.platform !== "darwin") {
    app.quit();
  }
});
