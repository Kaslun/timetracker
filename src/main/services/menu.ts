import { Menu, app } from "electron";
import { SHORTCUTS } from "@shared/hotkeys";
import {
  ensureDashboard,
  ensureSettings,
  ensureCheatsheet,
  ensureIntegration,
  showPill,
  hidePill,
  spawnToast,
  toggleMorph,
  getMode,
} from "../windows/manager";
import { requestQuit } from "./quit";
import { shortcutAccelerator } from "./shortcuts";

/** Menus only honor proper accelerators (with modifiers). For in-app
 *  shortcuts we render the bare key as a hint — Electron treats single-key
 *  accelerators as no-ops anyway, but the visible label is still useful. */
const ACCEL = (k: keyof typeof SHORTCUTS): string => {
  const sc = SHORTCUTS[k];
  const combo = shortcutAccelerator(k);
  if (sc.scope === "global") return combo.replace(/\bCtrl\b/g, "Control");
  return combo;
};

export function buildAppMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "&File",
      submenu: [
        { label: "Show pill", click: () => showPill() },
        { label: "Hide pill", click: () => hidePill() },
        { type: "separator" },
        { label: "Settings…", click: () => ensureSettings() },
        { type: "separator" },
        {
          label: "Quit Attensi Time Tracker",
          accelerator: ACCEL("quitApp"),
          click: () => requestQuit(),
        },
      ],
    },
    {
      label: "&View",
      submenu: [
        {
          label: "Expanded",
          accelerator: ACCEL("expandWindow"),
          click: () => {
            if (getMode() !== "expanded") toggleMorph({ force: "expanded" });
          },
        },
        { label: "Dashboard", click: () => ensureDashboard() },
        {
          label: "Cheatsheet",
          accelerator: ACCEL("cheatsheet"),
          click: () => ensureCheatsheet(),
        },
        { type: "separator" },
        {
          label: "Demo",
          submenu: [
            { label: "Slack toast", click: () => spawnToast("slack") },
            { label: "Teams toast", click: () => spawnToast("teams") },
            {
              label: "Idle recovery toast",
              click: () => spawnToast("idle_recover"),
            },
            {
              label: "Retro fill toast",
              click: () => spawnToast("retro_fill"),
            },
            { type: "separator" },
            {
              label: "Linear integration",
              click: () => ensureIntegration("linear"),
            },
          ],
        },
        ...(process.env["NODE_ENV"] !== "production"
          ? [
              { type: "separator" as const },
              { role: "reload" as const },
              { role: "forceReload" as const },
              { role: "toggleDevTools" as const },
            ]
          : []),
      ],
    },
    {
      label: "&Help",
      submenu: [
        {
          label: "Keyboard shortcuts",
          accelerator: ACCEL("cheatsheet"),
          click: () => ensureCheatsheet(),
        },
        {
          label: `About ${app.getName()}`,
          click: () => {
            // intentionally empty: about window is post-v1
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
