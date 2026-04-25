import { create } from "zustand";
import { rpc, on } from "@/lib/api";
import { applyTheme } from "@/themes/themes";
import type {
  Settings,
  CurrentTaskView,
  TaskWithProject,
  EntryRow,
  Capture,
  Project,
  FillSuggestion,
  ThemeId,
} from "@shared/types";
import { DEFAULT_SETTINGS } from "@shared/constants";

interface AppState {
  ready: boolean;
  platform: "win" | "mac" | "linux";
  current: CurrentTaskView;
  tasks: TaskWithProject[];
  entries: EntryRow[];
  captures: Capture[];
  settings: Settings;
  projects: Project[];
  fillSuggestions: FillSuggestion[];
  /** millis since unix epoch — bumped every second so derived elapsed re-renders. */
  tick: number;

  bootstrap: () => Promise<void>;
  patchSettings: (patch: Partial<Settings>) => Promise<void>;
  setTheme: (theme: ThemeId) => Promise<void>;
  toggle: () => Promise<void>;
  pause: () => Promise<void>;
  start: (taskId: string) => Promise<void>;
}

const EMPTY_CURRENT: CurrentTaskView = {
  taskId: null,
  ticket: null,
  title: "No task running",
  projectName: "",
  projectColor: "#8a8a8a",
  elapsedSec: 0,
  todaySec: 0,
  running: false,
  entryId: null,
  startedAt: null,
};

export const useStore = create<AppState>((set, get) => ({
  ready: false,
  platform: "win",
  current: EMPTY_CURRENT,
  tasks: [],
  entries: [],
  captures: [],
  settings: DEFAULT_SETTINGS,
  projects: [],
  fillSuggestions: [],
  tick: Date.now(),

  async bootstrap() {
    const data = await rpc("app:bootstrap");
    set({
      ready: true,
      platform: data.platform,
      current: data.current,
      tasks: data.tasks,
      entries: data.todayEntries,
      captures: data.captures,
      settings: data.settings,
      projects: data.projects,
      fillSuggestions: data.fillSuggestions,
    });
    applyTheme(data.settings.theme);
  },

  async patchSettings(patch) {
    const next = await rpc("settings:patch", patch);
    set({ settings: next });
    if (patch.theme) applyTheme(patch.theme);
  },

  async setTheme(theme) {
    await get().patchSettings({ theme });
  },

  async toggle() {
    const next = await rpc("task:toggle");
    set({ current: next });
  },
  async pause() {
    const next = await rpc("task:pause");
    set({ current: next });
  },
  async start(taskId) {
    const next = await rpc("task:start", { taskId });
    set({ current: next });
  },
}));

let wired = false;
let tickHandle: ReturnType<typeof setInterval> | null = null;

export function wireGlobalSubscriptions(): void {
  if (wired) return;
  wired = true;
  on("current:changed", (cur) => useStore.setState({ current: cur }));
  on("tasks:changed", (t) => useStore.setState({ tasks: t }));
  on("entries:changed", (e) => useStore.setState({ entries: e }));
  on("captures:changed", (c) => useStore.setState({ captures: c }));
  on("settings:changed", (s) => {
    useStore.setState({ settings: s });
    applyTheme(s.theme);
  });

  if (tickHandle) clearInterval(tickHandle);
  tickHandle = setInterval(() => {
    useStore.setState({ tick: Date.now() });
  }, 1000);
}

/**
 * Live elapsed seconds for the current task — derived from the open entry's
 * startedAt and the current tick so the counter advances each second.
 */
export function selectLiveElapsed(state: AppState): number {
  if (!state.current.running || !state.current.startedAt)
    return state.current.elapsedSec;
  return Math.max(0, Math.floor((state.tick - state.current.startedAt) / 1000));
}

export function selectLiveTodaySec(state: AppState): number {
  if (!state.current.running || !state.current.startedAt)
    return state.current.todaySec;
  const liveElapsed = Math.max(
    0,
    Math.floor((state.tick - state.current.startedAt) / 1000),
  );
  return state.current.todaySec - state.current.elapsedSec + liveElapsed;
}
