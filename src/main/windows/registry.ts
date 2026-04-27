/**
 * Window registry — the single in-memory map of every BrowserWindow we own.
 *
 * Per-window factories (pill.ts, expanded.ts, …) read from / write to this
 * registry; they don't keep their own module-level state. This keeps shutdown
 * simple (one place to enumerate everything) and makes hot-reload predictable
 * during dev.
 */
import type { BrowserWindow } from "electron";
import type { IntegrationPanelId, ToastKind } from "@shared/constants";

interface Singletons {
  pill: BrowserWindow | null;
  expanded: BrowserWindow | null;
  dashboard: BrowserWindow | null;
  intro: BrowserWindow | null;
  settings: BrowserWindow | null;
  cheatsheet: BrowserWindow | null;
  eod: BrowserWindow | null;
}

export const state: Singletons & {
  toasts: Map<ToastKind, BrowserWindow>;
  integrations: Map<IntegrationPanelId, BrowserWindow>;
} = {
  pill: null,
  expanded: null,
  dashboard: null,
  intro: null,
  settings: null,
  cheatsheet: null,
  eod: null,
  toasts: new Map(),
  integrations: new Map(),
};

export type SingletonKind = keyof Singletons;

export function listAllWindows(): BrowserWindow[] {
  const list: BrowserWindow[] = [];
  for (const k of [
    "pill",
    "expanded",
    "dashboard",
    "intro",
    "settings",
    "cheatsheet",
    "eod",
  ] as const) {
    const w = state[k];
    if (w && !w.isDestroyed()) list.push(w);
  }
  for (const t of state.toasts.values()) if (!t.isDestroyed()) list.push(t);
  for (const i of state.integrations.values())
    if (!i.isDestroyed()) list.push(i);
  return list;
}

export function getWindow(kind: SingletonKind): BrowserWindow | null {
  return state[kind];
}
