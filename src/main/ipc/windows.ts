import { BrowserWindow } from "electron";
import { settings } from "../db/repos";
import {
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
  toggleMorph,
  getMode,
} from "../windows/manager";
import { register } from "./handlers";
import { broadcast } from "./events";
import { broadcastChanges } from "./broadcast";

export function registerWindows(): void {
  register("window:openExpanded", () => {
    if (getMode() !== "expanded") toggleMorph({ force: "expanded" });
  });
  register("window:toggleExpanded", () => {
    toggleMorph();
  });
  register("window:openDashboard", () => {
    ensureDashboard();
  });
  register("window:openSettings", (input) => {
    ensureSettings({ section: input?.section });
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
  register("window:minimizeFocused", () => {
    BrowserWindow.getFocusedWindow()?.minimize();
  });
  register("window:maximizeFocused", () => {
    const w = BrowserWindow.getFocusedWindow();
    if (!w) return;
    if (w.isMaximized()) w.unmaximize();
    else w.maximize();
  });
  register("window:setExpandedTab", ({ tab }) => {
    broadcast("expanded:tab", tab);
    if (getMode() !== "expanded") toggleMorph({ force: "expanded" });
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
