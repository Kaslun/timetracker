import { app } from "electron";

export function setAutoLaunch(enabled: boolean): void {
  if (process.platform !== "win32") return;
  app.setLoginItemSettings({
    openAtLogin: enabled,
    path: app.getPath("exe"),
  });
}

export function getAutoLaunch(): boolean {
  if (process.platform !== "win32") return false;
  return app.getLoginItemSettings().openAtLogin;
}
