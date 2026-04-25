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
  toggleExpanded,
} from "../windows/manager";

const ACCEL = (k: keyof typeof SHORTCUTS): string =>
  SHORTCUTS[k].win.replace(/\bCtrl\b/g, "Control");

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
        { role: "quit", label: "Quit" },
      ],
    },
    {
      label: "&View",
      submenu: [
        {
          label: "Expanded",
          accelerator: ACCEL("expandWindow"),
          click: () => toggleExpanded({ alwaysShow: true }),
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
