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

/**
 * Five-step priority ladder. Modeled on Linear (their `0` "no priority" maps
 * to `"none"` and `1..4` to urgent/high/medium/low) but kept as a string enum
 * because Jira / Asana / GitHub have their own scales we map *into* this.
 */
export type TaskPriority = "urgent" | "high" | "medium" | "low" | "none";

export const TASK_PRIORITIES: readonly TaskPriority[] = [
  "urgent",
  "high",
  "medium",
  "low",
  "none",
] as const;

/** Numeric weight used by the picker / "highest priority first" sort. */
export const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
};

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
  /** Wall-clock ms when the task was last updated (locally or via sync). */
  updatedAt: number;
  /**
   * Source integration that imported this task (e.g. `"linear"`), or null for
   * locally-created tasks. Used by the editor to lock fields owned by the
   * source provider — the user can still re-tag or move the task locally.
   */
  integrationId: string | null;
  /** Priority bucket. Defaults to "none" for locally-created tasks. */
  priority: TaskPriority;
  /**
   * Canonical URL for the source issue/ticket (e.g. the Linear/Jira deep link).
   * Click-target for the source chip on the task row. Null for local tasks.
   */
  externalUrl: string | null;
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
 * Days of the week, in display order. Used as keys into `WorkHours`.
 */
export const WEEKDAY_IDS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;
export type WeekdayId = (typeof WEEKDAY_IDS)[number];

/** A single contiguous time window inside one day. */
export interface WorkHoursRange {
  /** "HH:MM", 00:00–23:59. */
  from: string;
  to: string;
}

export interface WorkHoursDay {
  enabled: boolean;
  /** Up to 3 ranges per day; must not overlap; each `from < to`. */
  ranges: WorkHoursRange[];
}

/**
 * Per-day work-hours map. Outside of any enabled range — or when the OS
 * reports DND/Focus and `respectSystemDnd` is true — no nudges fire.
 *
 * Replaces the v4 single-range `{ days, from, to }` shape. The store hydrates
 * from the legacy shape via `migrateLegacyWorkHours` so v4 settings keep
 * working after upgrade.
 */
export type WorkHours = Record<WeekdayId, WorkHoursDay>;

/** Legacy single-range shape kept for migration only. */
export interface LegacyWorkHours {
  days: WeekdayId[];
  from: string;
  to: string;
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

/**
 * Sort modes available in the Tasks tab.
 *
 * `"suggested"` is the picker-friendly order: pinned-running, then
 * urgent/high updated in the last 7 days, then recently tracked, then
 * everything else. See `sortBySuggestion` for the precise rule.
 */
export type TaskSort =
  | "suggested"
  | "updated"
  | "priority"
  | "tracked"
  | "alpha"
  | "created";

/** Status filter applied client-side (server stores `archivedAt`). */
export type TaskStatusFilter = "active" | "archived" | "all";

/**
 * Filter + sort state for the Tasks tab. Persists in `Settings.taskFilters`
 * so reopening the app restores the user's last view.
 */
export interface TaskFilters {
  query: string;
  /** Project ids; empty = all projects. */
  projectIds: string[];
  /** Source tokens — integration ids OR `"local"` for tasks without one. */
  sources: string[];
  /** Tag/label values; empty = all tags. */
  tags: string[];
  status: TaskStatusFilter;
  /** Priority bucket(s); empty = all priorities. */
  priorities: TaskPriority[];
  sort: TaskSort;
}

/** A user-named filter+sort combo. Max 5 saved per user (UI enforced). */
export interface SavedTaskView {
  id: string;
  name: string;
  filters: TaskFilters;
}

/**
 * Per-provider configuration. Lives in `Settings.integrationConfigs`
 * keyed by `IntegrationId`. New providers default to `assigneeOnly: true`,
 * `includeUnassignedICreated: false`.
 */
export interface IntegrationConfig {
  /** Fetch only tasks where the authenticated user is the assignee. */
  assigneeOnly: boolean;
  /** Include tasks the user *created* even when assignee is empty. */
  includeUnassignedICreated: boolean;
  /** Jira-only: Tempo timesheets bridge. Undefined for non-Jira providers. */
  tempo?: TempoConfig;
}

/** Jira → Tempo worklog sync configuration. */
export interface TempoConfig {
  /** Whether the Tempo bridge is active. Detection sets `detected`. */
  enabled: boolean;
  /** Auto-set true when the Tempo REST endpoint responded on probe. */
  detected: boolean;
  /** Dry-run mode: log what would sync, don't hit the API. */
  dryRun: boolean;
  /** Minutes between auto-syncs while the app is open. */
  intervalMinutes: number;
}

export interface Settings {
  firstRunComplete: boolean;
  userName: string | null;
  theme: ThemeId;
  density: Density;
  idleThresholdMinutes: number;
  fillGapMinutes: number;
  nudges: NudgeSettings;
  /**
   * Per-day work-hours map. Every weekday is present; an all-disabled map
   * means "no work-hours gate" (nudges allowed 24/7).
   */
  workHours: WorkHours;
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
  /** Tasks tab filter + sort state (last-used). */
  taskFilters: TaskFilters;
  /** Saved Tasks tab views (max 5). */
  savedTaskViews: SavedTaskView[];
  /** Per-integration configuration (assignee-only, Tempo, etc.). */
  integrationConfigs: Record<string, IntegrationConfig>;
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
  /**
   * Source provider id (e.g. `"linear"`, `"jira"`) — null when the running
   * task is local. Used by the pill task chip to render the source tag.
   */
  integrationId: string | null;
  /**
   * Deep-link URL into the source provider (e.g. the Linear issue page).
   * Null when the task is local or when the provider has no per-task URL.
   */
  externalUrl: string | null;
}

export interface TaskWithProject extends Task {
  projectName: string;
  projectColor: string;
  /** Total seconds logged today against this task. */
  todaySec: number;
  /** Total seconds logged against this task across all time (for sorting). */
  totalSec: number;
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
  /**
   * Integration provider id of the underlying task, or null when local.
   * Surfaced so the timeline can render a `SourceTag` chip without a
   * second IPC roundtrip.
   */
  integrationId: string | null;
  /** Deep-link URL to the task in the source provider. */
  externalUrl: string | null;
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

/**
 * Payload for the daily "top priority today" nudge. Fires once per work-day
 * at the first work-hours tick. The renderer surfaces it as a low-key inline
 * banner — the user can act on it (start the task) or dismiss.
 */
export interface TopPriorityNudgePayload {
  kind: "top_priority";
  taskId: string;
  taskTitle: string;
  ticket: string | null;
  projectName: string;
  projectColor: string;
  priority: TaskPriority;
}
