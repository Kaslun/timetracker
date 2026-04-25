import { BrowserWindow } from "electron";
import { settings } from "../db/repos";
import {
  ensureExpanded,
  toggleExpanded,
  ensureDashboard,
  ensureSettings,
  ensureCheatsheet,
  ensureIntegration,
  showPill,
  hidePill,
  closeIntro,
  setPillPosition,
  pillResize,
  spawnToast,
} from "../windows/manager";
import { register } from "./handlers";
import { broadcast } from "./events";
import { broadcastChanges } from "./broadcast";

export function registerWindows(): void {
  register("window:openExpanded", () => {
    ensureExpanded();
  });
  register("window:toggleExpanded", () => {
    toggleExpanded();
  });
  register("window:openDashboard", () => {
    ensureDashboard();
  });
  register("window:openSettings", () => {
    ensureSettings();
  });
  register("window:openCheatsheet", () => {
    ensureCheatsheet();
  });
  register("window:openIntegration", ({ id }) => {
    ensureIntegration(id);
  });
  register("window:hidePill", () => {
    hidePill();
  });
  register("window:showPill", () => {
    showPill();
  });
  register("window:closeIntro", (input) => {
    if (input) {
      settings.patch({
        userName: input.name ?? null,
        integrationsConnected: input.connected,
        firstRunComplete: true,
      });
    } else {
      settings.patch({ firstRunComplete: true });
    }
    broadcastChanges({ settings: true });
    closeIntro();
    showPill();
  });
  register("window:close", () => {
    BrowserWindow.getFocusedWindow()?.close();
  });
  register("window:setExpandedTab", ({ tab }) => {
    broadcast("expanded:tab", tab);
    ensureExpanded();
  });

  register("pill:setPosition", ({ displayId, x, y }) => {
    setPillPosition(displayId, x, y);
  });
  register("pill:resize", ({ state: s }) => {
    pillResize(s);
    broadcast("pill:state", s);
  });

  register("demo:toast", ({ kind }) => {
    spawnToast(kind);
  });
}
