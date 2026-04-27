import { Tray, Menu, nativeImage } from "electron";
import type { NativeImage } from "electron";
import { SHORTCUTS } from "@shared/hotkeys";
import type { ThemeId } from "@shared/types";
import {
  ensurePill,
  showPill,
  hidePill,
  ensureDashboard,
  ensureSettings,
} from "../windows/manager";
import { settings } from "../db/repos/settings";
import { broadcast } from "../ipc/events";
import { setAutoLaunch } from "./autolaunch";
import { requestQuit } from "./quit";

let tray: Tray | null = null;

const THEME_OPTIONS: { id: ThemeId; label: string }[] = [
  { id: "warm", label: "Warm" },
  { id: "clin", label: "Clinical" },
  { id: "paper", label: "Paper" },
  { id: "term", label: "Terminal" },
  { id: "mid", label: "Midnight" },
  { id: "ember", label: "Ember" },
];

function buildIcon(): NativeImage {
  const w = 16;
  const h = 16;
  const buf = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const cx = x - 7.5;
      const cy = y - 7.5;
      const d = Math.sqrt(cx * cx + cy * cy);
      const inside = d < 6;
      const ring = d >= 6 && d < 7;
      // BGRA
      buf[i + 0] = inside ? 0x3a : 0x00;
      buf[i + 1] = inside ? 0x63 : 0x00;
      buf[i + 2] = inside ? 0xb8 : 0x00;
      buf[i + 3] = inside ? 0xff : ring ? 0x80 : 0x00;
    }
  }
  return nativeImage.createFromBitmap(buf, { width: w, height: h });
}

export function createTray(): void {
  if (tray) return;

  tray = new Tray(buildIcon());
  tray.setToolTip("Attensi Time Tracker");

  rebuildMenu();

  tray.on("click", () => {
    // Single-click: toggle pill visibility
    const cfg = settings.getAll();
    if (cfg.pillVisible) hidePill();
    else showPill();
    rebuildMenu();
  });

  tray.on("double-click", () => {
    ensureDashboard();
  });
}

export function rebuildMenu(): void {
  if (!tray) return;
  const cfg = settings.getAll();

  const menu = Menu.buildFromTemplate([
    {
      label: cfg.pillVisible ? "Hide pill" : "Show pill",
      click: () => {
        if (cfg.pillVisible) hidePill();
        else {
          ensurePill();
          showPill();
        }
        rebuildMenu();
      },
    },
    {
      label: "Show dashboard",
      click: () => {
        ensureDashboard();
      },
    },
    {
      label: "Brain dump…",
      accelerator: SHORTCUTS.brainDumpGlobal.win.replace(
        /\bCtrl\b/g,
        "Control",
      ),
      click: () => {
        const pill = ensurePill();
        if (!pill.isVisible()) pill.show();
        pill.focus();
        broadcast("pill:focus-dump", undefined);
      },
    },
    { type: "separator" },
    {
      label: "Theme",
      submenu: THEME_OPTIONS.map((t) => ({
        label: t.label,
        type: "radio" as const,
        checked: cfg.theme === t.id,
        click: () => {
          settings.patch({ theme: t.id });
          broadcast("settings:changed", settings.getAll());
          rebuildMenu();
        },
      })),
    },
    {
      label: "Settings…",
      click: () => {
        ensureSettings();
      },
    },
    { type: "separator" },
    {
      label: "Auto-launch on boot",
      type: "checkbox",
      checked: cfg.autoLaunch,
      click: (item) => {
        setAutoLaunch(item.checked);
        settings.patch({ autoLaunch: item.checked });
        broadcast("settings:changed", settings.getAll());
        rebuildMenu();
      },
    },
    { type: "separator" },
    {
      label: "Quit Attensi Time Tracker",
      accelerator: SHORTCUTS.quitApp.win.replace(/\bCtrl\b/g, "Control"),
      click: () => requestQuit(),
    },
  ]);

  tray.setContextMenu(menu);
}

export function destroyTray(): void {
  tray?.destroy();
  tray = null;
}
