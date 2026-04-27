/**
 * IPC contract — single source of truth for every channel name + payload shape.
 *
 * Both main and renderer import from here. Zod schemas double as runtime
 * validation guards (preload validates input, handlers validate output).
 *
 * The data-shape primitives are split into `models.ts` to keep this file
 * focused on channel/event wiring.
 */
import { z } from "zod";
import {
  ZBootstrap,
  ZCapture,
  ZCurrentTaskView,
  ZEntry,
  ZEntryRow,
  ZEntrySource,
  ZFillSuggestion,
  ZIntegrationId,
  ZIntegrationState,
  ZNudgeEvent,
  ZProject,
  ZSettings,
  ZTask,
  ZTaskWithProject,
} from "./models";

export {
  ZBootstrap,
  ZCapture,
  ZCurrentTaskView,
  ZDensity,
  ZEntry,
  ZEntryRow,
  ZEntrySource,
  ZFillSuggestion,
  ZIntegrationId,
  ZIntegrationState,
  ZIntegrationStatus,
  ZNudgeEvent,
  ZProject,
  ZSettings,
  ZTask,
  ZTaskWithProject,
  ZThemeId,
} from "./models";

const ZToastKind = z.enum(["slack", "teams", "idle_recover", "retro_fill"]);
const ZTabId = z.enum(["timeline", "list", "inbox", "fill"]);
const ZPillResize = z.enum(["collapsed", "dump"]);
const ZPillMode = z.enum(["pill", "expanded"]);

const ZEodGap = z.object({
  startedAt: z.number(),
  endedAt: z.number(),
  minutes: z.number(),
});
export const ZEodSummary = z.object({
  loggedSec: z.number(),
  looseSec: z.number(),
  gaps: z.array(ZEodGap),
});

const ZUpdateInfo = z.object({
  current: z.string(),
  latest: z.string().nullable(),
  hasUpdate: z.boolean(),
  url: z.string().nullable(),
  notes: z.string().nullable(),
  checkedAt: z.number(),
  error: z.string().nullable(),
});

export const ZCustomTag = z.object({
  id: z.string(),
  label: z.string(),
  createdAt: z.number(),
});

/**
 * Tuple `[inputSchema, outputSchema]`. `z.void()` for no-arg / no-return.
 * Adding a channel = one new entry here + a `register()` call on the main
 * side. Renderer types update automatically.
 */
export const CHANNELS = {
  "app:bootstrap": [z.void(), ZBootstrap],

  "task:start": [z.object({ taskId: z.string() }), ZCurrentTaskView],
  "task:pause": [z.void(), ZCurrentTaskView],
  "task:toggle": [z.void(), ZCurrentTaskView],
  "task:switch": [z.object({ taskId: z.string() }), ZCurrentTaskView],
  "task:current": [z.void(), ZCurrentTaskView],
  "task:list": [z.void(), z.array(ZTaskWithProject)],
  "task:create": [
    z.object({
      projectId: z.string(),
      title: z.string(),
      ticket: z.string().nullable().optional(),
      tag: z.string().nullable().optional(),
    }),
    ZTask,
  ],
  "task:archive": [z.object({ id: z.string() }), z.void()],
  "task:setCompleted": [
    z.object({ id: z.string(), completed: z.boolean() }),
    z.void(),
  ],

  "entry:list": [
    z.object({
      from: z.number().optional(),
      to: z.number().optional(),
      taskId: z.string().optional(),
    }),
    z.array(ZEntryRow),
  ],
  "entry:update": [
    z.object({ id: z.string(), patch: ZEntry.partial() }),
    z.void(),
  ],
  "entry:delete": [z.object({ id: z.string() }), z.void()],
  "entry:insert": [
    z.object({
      taskId: z.string(),
      startedAt: z.number(),
      endedAt: z.number(),
      source: ZEntrySource,
      note: z.string().nullable().optional(),
    }),
    ZEntry,
  ],

  "project:list": [z.void(), z.array(ZProject)],

  "capture:create": [
    z.object({ text: z.string(), tag: z.string().nullable().optional() }),
    ZCapture,
  ],
  "capture:list": [
    z.object({ limit: z.number().optional() }).optional(),
    z.array(ZCapture),
  ],
  "capture:tag": [
    z.object({ id: z.string(), tag: z.string().nullable() }),
    z.void(),
  ],
  "capture:archive": [z.object({ id: z.string() }), z.void()],

  "settings:get": [z.void(), ZSettings],
  "settings:patch": [ZSettings.partial(), ZSettings],

  "integration:list": [z.void(), z.array(ZIntegrationState)],
  "integration:connect": [
    z.object({
      id: ZIntegrationId,
      token: z.string().min(1),
      workspace: z.string().nullable().optional(),
      scopes: z.array(z.string()).optional(),
    }),
    ZIntegrationState,
  ],
  "integration:disconnect": [
    z.object({ id: ZIntegrationId }),
    ZIntegrationState,
  ],

  "nudge:dismiss": [z.object({ kind: z.string() }), z.void()],
  "nudge:active": [
    z.object({ kind: z.enum(["idle_recover", "retro_fill"]) }),
    ZNudgeEvent.nullable(),
  ],
  "idle:resolve": [
    z.object({
      choice: z.enum(["discard", "meeting", "keep", "custom"]),
      gapStartedAt: z.number(),
      gapEndedAt: z.number(),
      taskId: z.string().optional(),
    }),
    z.void(),
  ],
  "fill:suggestions": [
    z.object({ minutes: z.number().optional() }).optional(),
    z.array(ZFillSuggestion),
  ],
  "fill:apply": [
    z.object({ suggestions: z.array(ZFillSuggestion) }),
    z.object({ inserted: z.number() }),
  ],

  "export:csv": [
    z.object({
      range: z.enum(["today", "week", "last", "month", "custom"]),
      from: z.number().optional(),
      to: z.number().optional(),
      columns: z.array(z.string()),
      grouping: z.enum(["entry", "task", "proj"]),
      preset: z.enum(["sheets", "toggl", "harvest", "custom"]),
    }),
    z.object({
      path: z.string().nullable(),
      rows: z.number(),
      filename: z.string(),
    }),
  ],

  "window:openExpanded": [z.void(), z.void()],
  "window:toggleExpanded": [z.void(), z.void()],
  "window:openDashboard": [z.void(), z.void()],
  "window:openSettings": [z.void(), z.void()],
  "window:openCheatsheet": [z.void(), z.void()],
  "window:openIntegration": [z.object({ id: z.enum(["linear"]) }), z.void()],
  "window:hidePill": [z.void(), z.void()],
  "window:showPill": [z.void(), z.void()],
  "window:closeIntro": [
    z
      .object({
        name: z.string().nullable(),
        connected: z.record(z.string(), z.boolean()),
      })
      .optional(),
    z.void(),
  ],
  "window:close": [z.void(), z.void()],
  "window:minimizeFocused": [z.void(), z.void()],
  "window:maximizeFocused": [z.void(), z.void()],
  "window:setExpandedTab": [z.object({ tab: ZTabId }), z.void()],

  "pill:setPosition": [
    z.object({ displayId: z.string(), x: z.number(), y: z.number() }),
    z.void(),
  ],
  "pill:resize": [z.object({ state: ZPillResize }), z.void()],

  "demo:toast": [z.object({ kind: ZToastKind }), z.void()],
  "autoLaunch:set": [z.object({ enabled: z.boolean() }), z.void()],

  "app:requestQuit": [z.void(), z.void()],
  "app:quitNow": [z.void(), z.void()],
  "app:cancelQuit": [z.void(), z.void()],
  /**
   * Renderer asks main to suspend or resume globally-registered shortcuts.
   * Used while a text input/textarea has focus so accelerators like
   * `Ctrl+Space` don't fire while the user is typing.
   */
  "shortcuts:setSuspended": [z.object({ suspended: z.boolean() }), z.void()],
  "eod:summary": [z.void(), ZEodSummary],

  "tag:list": [z.void(), z.array(ZCustomTag)],
  "tag:create": [z.object({ label: z.string().min(1) }), ZCustomTag],
  "tag:delete": [z.object({ id: z.string() }), z.void()],

  "update:check": [z.void(), ZUpdateInfo],
  "update:open": [z.void(), z.void()],
} as const;

export type ChannelName = keyof typeof CHANNELS;
export type ChannelInput<C extends ChannelName> = z.infer<
  (typeof CHANNELS)[C][0]
>;
export type ChannelOutput<C extends ChannelName> = z.infer<
  (typeof CHANNELS)[C][1]
>;

/**
 * Push events from main → renderer (no response). Listed separately from
 * CHANNELS so the renderer can subscribe in a typed way.
 */
export const EVENTS = {
  "current:changed": ZCurrentTaskView,
  "tasks:changed": z.array(ZTaskWithProject),
  "entries:changed": z.array(ZEntryRow),
  "captures:changed": z.array(ZCapture),
  "settings:changed": ZSettings,
  "integrations:changed": z.array(ZIntegrationState),
  "nudge:fire": ZNudgeEvent,
  "pill:state": ZPillResize,
  "pill:mode": z.object({ mode: ZPillMode }),
  "expanded:state": z.object({ visible: z.boolean() }),
  "expanded:tab": ZTabId,
  "expanded:focus-search": z.void(),
  "pill:focus-dump": z.void(),
  "demo:toast": z.object({ kind: ZToastKind }),
  "tags:changed": z.array(ZCustomTag),
  "update:available": ZUpdateInfo,
} as const;

export type EventName = keyof typeof EVENTS;
export type EventPayload<E extends EventName> = z.infer<(typeof EVENTS)[E]>;
