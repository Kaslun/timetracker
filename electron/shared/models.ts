/**
 * Shared row/dto shapes that travel between main and renderer.
 * Lives under electron/shared so both sides import from one place.
 */

export type EntrySource = 'manual' | 'fill' | 'teams' | 'idle_recover' | 'sprint';

export interface Project {
  id: string;
  name: string;
  color: string;
  ticketPrefix: string | null;
  integrationId: string | null;
  archivedAt: number | null;
}

export interface Task {
  id: string;
  projectId: string;
  ticket: string | null;
  title: string;
  tag: string | null;
  archivedAt: number | null;
  createdAt: number;
}

export interface Entry {
  id: string;
  taskId: string;
  startedAt: number;
  endedAt: number | null;
  source: EntrySource;
  note: string | null;
}

export interface Capture {
  id: string;
  text: string;
  tag: string | null;
  createdAt: number;
  archivedAt: number | null;
}

export interface NudgeRow {
  kind: string;
  lastShownAt: number | null;
  lastDismissedAt: number | null;
}

export type ThemeId = 'warm' | 'clin' | 'paper' | 'term' | 'mid' | 'ember';
export type Density = 'compact' | 'regular' | 'comfy';

export interface NudgeSettings {
  idleRecovery: boolean;
  retroactiveFill: boolean;
  focusSprintCheckins: boolean;
  hyperfocusAlerts: boolean;
  contextSwitchConfirm: boolean;
}

export interface QuietHours {
  days: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun')[];
  from: string; // "HH:MM"
  to: string;   // "HH:MM"
}

export interface PillPosition {
  x: number;
  y: number;
}

export interface Settings {
  firstRunComplete: boolean;
  userName: string | null;
  theme: ThemeId;
  density: Density;
  idleThresholdMinutes: number;
  fillGapMinutes: number;
  nudges: NudgeSettings;
  quietHours: QuietHours | null;
  integrationsConnected: Record<string, boolean>;
  pillPositions: Record<string, PillPosition>;
  pillLastDisplayId: string | null;
  pillVisible: boolean;
  autoLaunch: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  firstRunComplete: false,
  userName: null,
  theme: 'warm',
  density: 'regular',
  idleThresholdMinutes: 15,
  fillGapMinutes: 45,
  nudges: {
    idleRecovery: true,
    retroactiveFill: true,
    focusSprintCheckins: true,
    hyperfocusAlerts: false,
    contextSwitchConfirm: false,
  },
  quietHours: { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], from: '18:00', to: '09:00' },
  integrationsConnected: {},
  pillPositions: {},
  pillLastDisplayId: null,
  pillVisible: true,
  autoLaunch: true,
};

/**
 * Composite shape returned by the "current task" query — drives the pill +
 * cockpit header. Mirrors the shape DATA.currentTask in hifi-data.jsx so
 * components can reuse the same field names.
 */
export interface CurrentTaskView {
  taskId: string | null;
  ticket: string | null;
  title: string;
  projectName: string;
  projectColor: string;
  elapsedSec: number;
  todaySec: number;
  running: boolean;
  entryId: string | null;
  /** Wall-clock ms when the open entry started, or null if none. */
  startedAt: number | null;
}

export interface TaskWithProject extends Task {
  projectName: string;
  projectColor: string;
  /** Total seconds logged today against this task. */
  todaySec: number;
  /** Whether this task currently has an open (running) entry. */
  active: boolean;
}

export interface EntryRow extends Entry {
  taskTitle: string;
  ticket: string | null;
  projectId: string;
  projectName: string;
  projectColor: string;
  tag: string | null;
}

export interface FillSuggestion {
  id: string;
  at: string;            // "HH:MM"
  src: string;           // "Teams" | "Slack" | "Linear" | "VS Code" | "Chrome"
  label: string;
  meta: string;
  confidence: number;    // 0..1
  picked: boolean;
  durationMinutes: number;
  taskId?: string;
}

export interface IdleNudgePayload {
  kind: 'idle_recover';
  gapStartedAt: number;
  gapEndedAt: number;
  durationMinutes: number;
  taskIdAtIdle: string | null;
}

export interface RetroNudgePayload {
  kind: 'retro_fill';
  gapStartedAt: number;
  gapEndedAt: number;
  durationMinutes: number;
  suggestions: FillSuggestion[];
}

export interface ToastPayload {
  kind: 'slack' | 'teams' | 'idle_recover' | 'retro_fill';
  data?: Record<string, unknown>;
}
