/**
 * IPC contract — single source of truth for every channel name + payload shape.
 * Both main and renderer import from here. Zod schemas double as runtime
 * validation guards (preload validates input, handlers validate output).
 */
import { z } from 'zod';

// ── Re-usable schemas ──────────────────────────────────────────────────────
export const ZThemeId = z.enum(['warm', 'clin', 'paper', 'term', 'mid', 'ember']);
export const ZDensity = z.enum(['compact', 'regular', 'comfy']);
export const ZEntrySource = z.enum(['manual', 'fill', 'teams', 'idle_recover', 'sprint']);

const ZProject = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  ticketPrefix: z.string().nullable(),
  integrationId: z.string().nullable(),
  archivedAt: z.number().nullable(),
});

const ZTask = z.object({
  id: z.string(),
  projectId: z.string(),
  ticket: z.string().nullable(),
  title: z.string(),
  tag: z.string().nullable(),
  archivedAt: z.number().nullable(),
  createdAt: z.number(),
});

const ZTaskWithProject = ZTask.extend({
  projectName: z.string(),
  projectColor: z.string(),
  todaySec: z.number(),
  active: z.boolean(),
});

const ZEntry = z.object({
  id: z.string(),
  taskId: z.string(),
  startedAt: z.number(),
  endedAt: z.number().nullable(),
  source: ZEntrySource,
  note: z.string().nullable(),
});

const ZEntryRow = ZEntry.extend({
  taskTitle: z.string(),
  ticket: z.string().nullable(),
  projectId: z.string(),
  projectName: z.string(),
  projectColor: z.string(),
  tag: z.string().nullable(),
});

const ZCapture = z.object({
  id: z.string(),
  text: z.string(),
  tag: z.string().nullable(),
  createdAt: z.number(),
  archivedAt: z.number().nullable(),
});

const ZCurrentTaskView = z.object({
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
});

const ZNudgeSettings = z.object({
  idleRecovery: z.boolean(),
  retroactiveFill: z.boolean(),
  focusSprintCheckins: z.boolean(),
  hyperfocusAlerts: z.boolean(),
  contextSwitchConfirm: z.boolean(),
});

const ZQuietHours = z
  .object({
    days: z.array(z.enum(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])),
    from: z.string(),
    to: z.string(),
  })
  .nullable();

const ZPillPosition = z.object({ x: z.number(), y: z.number() });

export const ZSettings = z.object({
  firstRunComplete: z.boolean(),
  userName: z.string().nullable(),
  theme: ZThemeId,
  density: ZDensity,
  idleThresholdMinutes: z.number(),
  fillGapMinutes: z.number(),
  nudges: ZNudgeSettings,
  quietHours: ZQuietHours,
  integrationsConnected: z.record(z.string(), z.boolean()),
  pillPositions: z.record(z.string(), ZPillPosition),
  pillLastDisplayId: z.string().nullable(),
  pillVisible: z.boolean(),
  autoLaunch: z.boolean(),
});

const ZFillSuggestion = z.object({
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
  kind: z.literal('idle_recover'),
  gapStartedAt: z.number(),
  gapEndedAt: z.number(),
  durationMinutes: z.number(),
  taskIdAtIdle: z.string().nullable(),
});
const ZRetroNudge = z.object({
  kind: z.literal('retro_fill'),
  gapStartedAt: z.number(),
  gapEndedAt: z.number(),
  durationMinutes: z.number(),
  suggestions: z.array(ZFillSuggestion),
});
const ZNudgeEvent = z.discriminatedUnion('kind', [ZIdleNudge, ZRetroNudge]);

const ZBootstrap = z.object({
  settings: ZSettings,
  current: ZCurrentTaskView,
  tasks: z.array(ZTaskWithProject),
  todayEntries: z.array(ZEntryRow),
  captures: z.array(ZCapture),
  projects: z.array(ZProject),
  fillSuggestions: z.array(ZFillSuggestion),
  platform: z.enum(['win', 'mac', 'linux']),
});

// ── CHANNELS ───────────────────────────────────────────────────────────────
// Tuple [inputSchema, outputSchema]. `z.void()` for no-arg / no-return.
export const CHANNELS = {
  'app:bootstrap':       [z.void(), ZBootstrap],

  'task:start':          [z.object({ taskId: z.string() }), ZCurrentTaskView],
  'task:pause':          [z.void(), ZCurrentTaskView],
  'task:toggle':         [z.void(), ZCurrentTaskView],
  'task:switch':         [z.object({ taskId: z.string() }), ZCurrentTaskView],
  'task:current':        [z.void(), ZCurrentTaskView],
  'task:list':           [z.void(), z.array(ZTaskWithProject)],
  'task:create':         [
    z.object({ projectId: z.string(), title: z.string(), ticket: z.string().nullable().optional(), tag: z.string().nullable().optional() }),
    ZTask,
  ],
  'task:archive':        [z.object({ id: z.string() }), z.void()],

  'entry:list':          [z.object({ from: z.number().optional(), to: z.number().optional(), taskId: z.string().optional() }), z.array(ZEntryRow)],
  'entry:update':        [z.object({ id: z.string(), patch: ZEntry.partial() }), z.void()],
  'entry:delete':        [z.object({ id: z.string() }), z.void()],
  'entry:insert':        [
    z.object({ taskId: z.string(), startedAt: z.number(), endedAt: z.number(), source: ZEntrySource, note: z.string().nullable().optional() }),
    ZEntry,
  ],

  'project:list':        [z.void(), z.array(ZProject)],

  'capture:create':      [z.object({ text: z.string(), tag: z.string().nullable().optional() }), ZCapture],
  'capture:list':        [z.object({ limit: z.number().optional() }).optional(), z.array(ZCapture)],
  'capture:tag':         [z.object({ id: z.string(), tag: z.string().nullable() }), z.void()],
  'capture:archive':     [z.object({ id: z.string() }), z.void()],

  'settings:get':        [z.void(), ZSettings],
  'settings:patch':      [ZSettings.partial(), ZSettings],

  'nudge:dismiss':       [z.object({ kind: z.string() }), z.void()],
  'nudge:active':        [z.object({ kind: z.enum(['idle_recover', 'retro_fill']) }), ZNudgeEvent.nullable()],
  'idle:resolve':        [
    z.object({
      choice: z.enum(['discard', 'meeting', 'keep', 'custom']),
      gapStartedAt: z.number(),
      gapEndedAt: z.number(),
      taskId: z.string().optional(),
    }),
    z.void(),
  ],
  'fill:suggestions':    [z.object({ minutes: z.number().optional() }).optional(), z.array(ZFillSuggestion)],
  'fill:apply':          [
    z.object({ suggestions: z.array(ZFillSuggestion) }),
    z.object({ inserted: z.number() }),
  ],

  'export:csv':          [
    z.object({
      range: z.enum(['today', 'week', 'last', 'month', 'custom']),
      from: z.number().optional(),
      to: z.number().optional(),
      columns: z.array(z.string()),
      grouping: z.enum(['entry', 'task', 'proj']),
      preset: z.enum(['sheets', 'toggl', 'harvest', 'custom']),
    }),
    z.object({ path: z.string().nullable(), rows: z.number(), filename: z.string() }),
  ],

  'window:openExpanded':   [z.void(), z.void()],
  'window:toggleExpanded': [z.void(), z.void()],
  'window:openDashboard':  [z.void(), z.void()],
  'window:openSettings':   [z.void(), z.void()],
  'window:openCheatsheet': [z.void(), z.void()],
  'window:openIntegration':[z.object({ id: z.enum(['linear']) }), z.void()],
  'window:hidePill':       [z.void(), z.void()],
  'window:showPill':       [z.void(), z.void()],
  'window:closeIntro':     [z.object({ name: z.string().nullable(), connected: z.record(z.string(), z.boolean()) }).optional(), z.void()],
  'window:close':          [z.void(), z.void()],
  'window:setExpandedTab': [z.object({ tab: z.enum(['timeline', 'list', 'inbox', 'fill']) }), z.void()],

  'pill:setPosition':     [z.object({ displayId: z.string(), x: z.number(), y: z.number() }), z.void()],
  'pill:resize':          [z.object({ state: z.enum(['collapsed', 'dump']) }), z.void()],

  'demo:toast':           [z.object({ kind: z.enum(['slack', 'teams', 'idle_recover', 'retro_fill']) }), z.void()],
  'autoLaunch:set':       [z.object({ enabled: z.boolean() }), z.void()],
} as const;

export type ChannelName = keyof typeof CHANNELS;

export type ChannelInput<C extends ChannelName> =
  z.infer<(typeof CHANNELS)[C][0]>;
export type ChannelOutput<C extends ChannelName> =
  z.infer<(typeof CHANNELS)[C][1]>;

// ── EVENTS (push from main → renderer, no response) ────────────────────────
export const EVENTS = {
  'current:changed':   ZCurrentTaskView,
  'tasks:changed':     z.array(ZTaskWithProject),
  'entries:changed':   z.array(ZEntryRow),
  'captures:changed':  z.array(ZCapture),
  'settings:changed':  ZSettings,
  'nudge:fire':        ZNudgeEvent,
  'pill:state':        z.enum(['collapsed', 'dump']),
  'expanded:tab':      z.enum(['timeline', 'list', 'inbox', 'fill']),
  'expanded:focus-search': z.void(),
  'pill:focus-dump':   z.void(),
  'demo:toast':        z.object({ kind: z.enum(['slack', 'teams', 'idle_recover', 'retro_fill']) }),
} as const;

export type EventName = keyof typeof EVENTS;
export type EventPayload<E extends EventName> = z.infer<(typeof EVENTS)[E]>;
