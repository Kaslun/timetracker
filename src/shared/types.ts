/**
 * Shared row/dto shapes that travel between main and renderer.
 * Lives under src/shared so both main and renderer import from one place.
 */

export type EntrySource =
  | "manual"
  | "fill"
  | "teams"
  | "idle_recover"
  | "sprint";

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
  /** Wall-clock ms when the user marked the task done; null while open. */
  completedAt: number | null;
  createdAt: number;
  /**
   * Source integration that imported this task (e.g. `"linear"`), or null for
   * locally-created tasks. Used by the editor to lock fields owned by the
   * source provider — the user can still re-tag or move the task locally.
   */
  integrationId: string | null;
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

export type ThemeId = "warm" | "clin" | "paper" | "term" | "mid" | "ember";
export type Density = "compact" | "regular" | "comfy";

export interface NudgeSettings {
  idleRecovery: boolean;
  retroactiveFill: boolean;
  focusSprintCheckins: boolean;
  hyperfocusAlerts: boolean;
  contextSwitchConfirm: boolean;
}

/**
 * Window during which nudges are *allowed*. Outside of this window — or when
 * the OS reports DND/Focus and `respectSystemDnd` is true — no nudges fire.
 */
export interface WorkHours {
  days: ("Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun")[];
  from: string; // "HH:MM"
  to: string; // "HH:MM"
}

export interface PillPosition {
  x: number;
  y: number;
}

/**
 * Aggregate per-project totals shown in the Projects tab list.
 *
 * `trackedSec` is bound to a particular date range (the renderer toggles
 * between week and month and re-fetches). `totalTasks` and `openTasks` cover
 * every non-archived task on the project regardless of range.
 */
export interface ProjectStats {
  projectId: string;
  totalTasks: number;
  openTasks: number;
  trackedSec: number;
}

/**
 * Persisted bounds for a non-pill window (expanded morph, dashboard, settings).
 * `displayId` is captured so we can re-position on the same monitor when the
 * user has multiple displays attached.
 */
export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  displayId: string | null;
  maximized: boolean;
}

/** A keyboard binding rebound by the user (overrides the built-in default). */
export interface ShortcutOverride {
  /** Modifier-prefixed combo, e.g. "Ctrl+Shift+T" or "Alt+J". */
  combo: string;
}

export interface Settings {
  firstRunComplete: boolean;
  userName: string | null;
  theme: ThemeId;
  density: Density;
  idleThresholdMinutes: number;
  fillGapMinutes: number;
  nudges: NudgeSettings;
  workHours: WorkHours | null;
  /** If true, nudges also defer to OS-level Do Not Disturb / Focus mode. */
  respectSystemDnd: boolean;
  integrationsConnected: Record<string, boolean>;
  pillPositions: Record<string, PillPosition>;
  pillLastDisplayId: string | null;
  pillVisible: boolean;
  autoLaunch: boolean;
  /** Order of tabs in the expanded window. See `tabOrder.normaliseTabOrder`. */
  expandedTabOrder: string[];
  /** User-rebound shortcut combos, keyed by shortcut id. */
  shortcutOverrides: Record<string, ShortcutOverride>;
  /** Last bounds (and display) for each resizable window. */
  windowBounds: Record<string, WindowBounds>;
}

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
  at: string; // "HH:MM"
  src: string; // "Teams" | "Slack" | "Linear" | "VS Code" | "Chrome"
  label: string;
  meta: string;
  confidence: number; // 0..1
  picked: boolean;
  durationMinutes: number;
  taskId?: string;
}

/**
 * The full set of providers we currently know how to render in the
 * Settings → Integrations panel and the first-run intro flow.
 */
export type IntegrationId =
  | "linear"
  | "jira"
  | "asana"
  | "slack"
  | "teams"
  | "github"
  | "gcal"
  | "notion";

/**
 * Lifecycle of an integration as far as the UI is concerned.
 *
 * - `disconnected`: no token in keychain.
 * - `connecting`: a connect attempt is in flight.
 * - `connected`: token persisted, provider is healthy.
 * - `error`: last connect or refresh attempt failed.
 */
export type IntegrationStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

/**
 * Snapshot of one integration provider, surfaced over IPC.
 *
 * `errorMessage` is set whenever `status === "error"` so the UI can render a
 * concrete reason rather than an opaque red dot.
 */
export interface IntegrationState {
  id: IntegrationId;
  label: string;
  meta: string;
  bg: string;
  letter: string;
  status: IntegrationStatus;
  errorMessage: string | null;
  /** Wall-clock ms of the last successful sync (or null). */
  lastSyncedAt: number | null;
  /** Free-form provider-supplied summary (e.g. workspace name). */
  account: string | null;
}

export interface IdleNudgePayload {
  kind: "idle_recover";
  gapStartedAt: number;
  gapEndedAt: number;
  durationMinutes: number;
  taskIdAtIdle: string | null;
}

export interface RetroNudgePayload {
  kind: "retro_fill";
  gapStartedAt: number;
  gapEndedAt: number;
  durationMinutes: number;
  suggestions: FillSuggestion[];
}

export interface ToastPayload {
  kind: "slack" | "teams" | "idle_recover" | "retro_fill";
  data?: Record<string, unknown>;
}
