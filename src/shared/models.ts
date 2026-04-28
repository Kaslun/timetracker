/**
 * Zod schemas for the data shapes that travel across IPC.
 *
 * These mirror the TypeScript types in `types.ts` and are kept here (rather
 * than alongside them) so the runtime validation guards are colocated with
 * the channel/event maps that use them.
 */
import { z } from "zod";

export const ZThemeId = z.enum([
  "warm",
  "clin",
  "paper",
  "term",
  "mid",
  "ember",
]);
export const ZDensity = z.enum(["compact", "regular", "comfy"]);
export const ZEntrySource = z.enum([
  "manual",
  "fill",
  "teams",
  "idle_recover",
  "sprint",
]);

export const ZProject = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  ticketPrefix: z.string().nullable(),
  integrationId: z.string().nullable(),
  archivedAt: z.number().nullable(),
});

export const ZTaskPriority = z.enum([
  "urgent",
  "high",
  "medium",
  "low",
  "none",
]);

export const ZTask = z.object({
  id: z.string(),
  projectId: z.string(),
  ticket: z.string().nullable(),
  title: z.string(),
  tag: z.string().nullable(),
  archivedAt: z.number().nullable(),
  completedAt: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
  integrationId: z.string().nullable(),
  priority: ZTaskPriority,
  externalUrl: z.string().nullable(),
});

export const ZTaskWithProject = ZTask.extend({
  projectName: z.string(),
  projectColor: z.string(),
  todaySec: z.number(),
  totalSec: z.number(),
  active: z.boolean(),
});

export const ZProjectStats = z.object({
  projectId: z.string(),
  totalTasks: z.number(),
  openTasks: z.number(),
  trackedSec: z.number(),
});

export const ZEntry = z.object({
  id: z.string(),
  taskId: z.string(),
  startedAt: z.number(),
  endedAt: z.number().nullable(),
  source: ZEntrySource,
  note: z.string().nullable(),
});

export const ZEntryRow = ZEntry.extend({
  taskTitle: z.string(),
  ticket: z.string().nullable(),
  projectId: z.string(),
  projectName: z.string(),
  projectColor: z.string(),
  tag: z.string().nullable(),
  integrationId: z.string().nullable(),
  externalUrl: z.string().nullable(),
});

export const ZCapture = z.object({
  id: z.string(),
  text: z.string(),
  tag: z.string().nullable(),
  createdAt: z.number(),
  archivedAt: z.number().nullable(),
});

export const ZCurrentTaskView = z.object({
  taskId: z.string().nullable(),
  ticket: z.string().nullable(),
  title: z.string(),
  projectName: z.string(),
  projectColor: z.string(),
  elapsedSec: z.number(),
  todaySec: z.number(),
  running: z.boolean(),
  entryId: z.string().nullable(),
  startedAt: z.number().nullable(),
  integrationId: z.string().nullable(),
  externalUrl: z.string().nullable(),
});

const ZNudgeSettings = z.object({
  idleRecovery: z.boolean(),
  retroactiveFill: z.boolean(),
  focusSprintCheckins: z.boolean(),
  hyperfocusAlerts: z.boolean(),
  contextSwitchConfirm: z.boolean(),
});

const ZWorkHoursRange = z.object({
  from: z.string(),
  to: z.string(),
});

const ZWorkHoursDay = z.object({
  enabled: z.boolean(),
  ranges: z.array(ZWorkHoursRange),
});

const ZWorkHours = z.object({
  Mon: ZWorkHoursDay,
  Tue: ZWorkHoursDay,
  Wed: ZWorkHoursDay,
  Thu: ZWorkHoursDay,
  Fri: ZWorkHoursDay,
  Sat: ZWorkHoursDay,
  Sun: ZWorkHoursDay,
});

const ZTaskFilters = z.object({
  query: z.string(),
  projectIds: z.array(z.string()),
  sources: z.array(z.string()),
  tags: z.array(z.string()),
  status: z.enum(["active", "archived", "all"]),
  priorities: z.array(ZTaskPriority),
  sort: z.enum([
    "suggested",
    "updated",
    "priority",
    "tracked",
    "alpha",
    "created",
  ]),
});

const ZSavedTaskView = z.object({
  id: z.string(),
  name: z.string(),
  filters: ZTaskFilters,
});

const ZTempoConfig = z.object({
  enabled: z.boolean(),
  detected: z.boolean(),
  dryRun: z.boolean(),
  intervalMinutes: z.number(),
});

const ZIntegrationConfig = z.object({
  assigneeOnly: z.boolean(),
  includeUnassignedICreated: z.boolean(),
  tempo: ZTempoConfig.optional(),
});

const ZPillPosition = z.object({ x: z.number(), y: z.number() });

const ZWindowBounds = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  displayId: z.string().nullable(),
  maximized: z.boolean(),
});

const ZShortcutOverride = z.object({ combo: z.string() });

export const ZSettings = z.object({
  firstRunComplete: z.boolean(),
  userName: z.string().nullable(),
  theme: ZThemeId,
  density: ZDensity,
  idleThresholdMinutes: z.number(),
  fillGapMinutes: z.number(),
  nudges: ZNudgeSettings,
  workHours: ZWorkHours,
  respectSystemDnd: z.boolean(),
  integrationsConnected: z.record(z.string(), z.boolean()),
  pillPositions: z.record(z.string(), ZPillPosition),
  pillLastDisplayId: z.string().nullable(),
  pillVisible: z.boolean(),
  autoLaunch: z.boolean(),
  expandedTabOrder: z.array(z.string()),
  shortcutOverrides: z.record(z.string(), ZShortcutOverride),
  windowBounds: z.record(z.string(), ZWindowBounds),
  taskFilters: ZTaskFilters,
  savedTaskViews: z.array(ZSavedTaskView),
  integrationConfigs: z.record(z.string(), ZIntegrationConfig),
});

export const ZIntegrationId = z.enum([
  "linear",
  "jira",
  "asana",
  "slack",
  "teams",
  "github",
  "gcal",
  "notion",
]);

export const ZIntegrationStatus = z.enum([
  "disconnected",
  "connecting",
  "connected",
  "error",
]);

export const ZIntegrationState = z.object({
  id: ZIntegrationId,
  label: z.string(),
  meta: z.string(),
  bg: z.string(),
  letter: z.string(),
  status: ZIntegrationStatus,
  errorMessage: z.string().nullable(),
  lastSyncedAt: z.number().nullable(),
  account: z.string().nullable(),
});

export const ZFillSuggestion = z.object({
  id: z.string(),
  at: z.string(),
  src: z.string(),
  label: z.string(),
  meta: z.string(),
  confidence: z.number(),
  picked: z.boolean(),
  durationMinutes: z.number(),
  taskId: z.string().optional(),
});

const ZIdleNudge = z.object({
  kind: z.literal("idle_recover"),
  gapStartedAt: z.number(),
  gapEndedAt: z.number(),
  durationMinutes: z.number(),
  taskIdAtIdle: z.string().nullable(),
});

const ZRetroNudge = z.object({
  kind: z.literal("retro_fill"),
  gapStartedAt: z.number(),
  gapEndedAt: z.number(),
  durationMinutes: z.number(),
  suggestions: z.array(ZFillSuggestion),
});

export const ZNudgeEvent = z.discriminatedUnion("kind", [
  ZIdleNudge,
  ZRetroNudge,
]);

/** Daily "top priority for today" nudge payload. Fires once per work-day. */
export const ZTopPriorityNudge = z.object({
  kind: z.literal("top_priority"),
  taskId: z.string(),
  taskTitle: z.string(),
  ticket: z.string().nullable(),
  projectName: z.string(),
  projectColor: z.string(),
  priority: ZTaskPriority,
});

export const ZBootstrap = z.object({
  settings: ZSettings,
  current: ZCurrentTaskView,
  tasks: z.array(ZTaskWithProject),
  todayEntries: z.array(ZEntryRow),
  captures: z.array(ZCapture),
  projects: z.array(ZProject),
  fillSuggestions: z.array(ZFillSuggestion),
  integrations: z.array(ZIntegrationState),
  platform: z.enum(["win", "mac", "linux"]),
});
