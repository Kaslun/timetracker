/**
 * Cross-cutting constants shared between main and renderer.
 *
 * Keep this small and stable: anything that's a "magic string used in two
 * places" belongs here. Channel names are owned by `schemas.ts`; UI tokens
 * are owned by `themes.ts`. This file is for pure value-level constants.
 */
import type { Settings, ThemeId, Density } from "./types";

/** Display name shown to the user. Used in window titles and the README. */
export const APP_NAME = "Attensi Time Tracker";

/** electron-builder appId — also the protocol bucket for any future deep links. */
export const APP_ID = "com.attensi.timetracker";

/** All theme IDs in display order. The Settings UI iterates this. */
export const THEME_IDS = [
  "warm",
  "clin",
  "paper",
  "term",
  "mid",
  "ember",
] as const satisfies readonly ThemeId[];

/** All density modes. */
export const DENSITIES = [
  "compact",
  "regular",
  "comfy",
] as const satisfies readonly Density[];

/** Top-level renderer window kinds. Values must match the `?window=` query param. */
export const WINDOW_KINDS = [
  "pill",
  "expanded",
  "dashboard",
  "intro",
  "toast",
  "settings",
  "cheatsheet",
  "integration",
] as const;
export type WindowKind = (typeof WINDOW_KINDS)[number];

/** Toast variants spawned by the main process. */
export const TOAST_KINDS = [
  "slack",
  "teams",
  "idle_recover",
  "retro_fill",
] as const;
export type ToastKind = (typeof TOAST_KINDS)[number];

/** Integration IDs that have a dedicated full-screen detail window. */
export const INTEGRATION_PANEL_IDS = ["linear"] as const;
export type IntegrationPanelId = (typeof INTEGRATION_PANEL_IDS)[number];

/** SQLite filename inside `app.getPath('userData')`. */
export const DB_FILENAME = "timetracker.sqlite";

/** Pill geometry — referenced by the manager and the renderer styles. */
export const PILL = {
  width: 380,
  collapsedHeight: 56,
  dumpHeight: 180,
  /** Margin from the screen edge when picking the default position. */
  edgeMargin: 20,
} as const;

/**
 * Expanded geometry. The pill window morphs to these dimensions when the
 * user toggles the expanded view; we don't open a separate window. Anchoring
 * is computed from the pill's current position with edge auto-detection.
 */
export const EXPANDED = {
  width: 460,
  height: 640,
} as const;

/** Stepped morph between pill and expanded sizes. ~16 frames over 250ms. */
export const MORPH = {
  frames: 16,
  durationMs: 250,
} as const;

/** Idle / retroactive-fill thresholds (defaults; overridable via Settings). */
export const NUDGE_DEFAULTS = {
  idleThresholdMinutes: 15,
  fillGapMinutes: 45,
  /** A nudge auto-discards itself if the user ignores it for this long. */
  autoDiscardHours: 2,
} as const;

/** First-time user defaults written when the SQLite DB is created. */
export const DEFAULT_SETTINGS: Settings = {
  firstRunComplete: false,
  userName: null,
  theme: "warm",
  density: "regular",
  idleThresholdMinutes: NUDGE_DEFAULTS.idleThresholdMinutes,
  fillGapMinutes: NUDGE_DEFAULTS.fillGapMinutes,
  nudges: {
    idleRecovery: true,
    retroactiveFill: true,
    focusSprintCheckins: true,
    hyperfocusAlerts: false,
    contextSwitchConfirm: false,
  },
  workHours: {
    days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    from: "09:00",
    to: "17:00",
  },
  respectSystemDnd: false,
  integrationsConnected: {},
  pillPositions: {},
  pillLastDisplayId: null,
  pillVisible: true,
  autoLaunch: true,
};
