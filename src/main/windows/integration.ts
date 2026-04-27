import type { BrowserWindow } from "electron";
import { APP_NAME, type IntegrationPanelId } from "@shared/constants";
import { createWindow } from "./factory";
import { state } from "./registry";

export function ensureIntegration(id: IntegrationPanelId): BrowserWindow {
  const existing = state.integrations.get(id);
  if (existing && !existing.isDestroyed()) {
    existing.show();
    existing.focus();
    return existing;
  }
  const win = createWindow({
    kind: "integration",
    width: 380,
    height: 460,
    frame: false,
    transparent: false,
    resizable: false,
    skipTaskbar: false,
    title: `${APP_NAME} · Integration · ${id}`,
    search: { integration: id },
  });
  win.on("closed", () => {
    state.integrations.delete(id);
  });
  state.integrations.set(id, win);
  return win;
}
