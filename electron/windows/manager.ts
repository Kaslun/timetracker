import { BrowserWindow, screen } from 'electron';
import { createWindow } from './factory';
import { settings as settingsRepo } from '../db/repos/settings';
import type { Settings } from '../shared/models';

interface State {
  pill: BrowserWindow | null;
  expanded: BrowserWindow | null;
  dashboard: BrowserWindow | null;
  intro: BrowserWindow | null;
  settings: BrowserWindow | null;
  cheatsheet: BrowserWindow | null;
  toasts: Map<string, BrowserWindow>;
  integrations: Map<string, BrowserWindow>;
}

const state: State = {
  pill: null,
  expanded: null,
  dashboard: null,
  intro: null,
  settings: null,
  cheatsheet: null,
  toasts: new Map(),
  integrations: new Map(),
};

const PILL_W = 380;
const PILL_H = 56;
const PILL_DUMP_H = 180;
const PILL_MARGIN = 20;

function pickPillPosition(): { x: number; y: number; displayId: string } {
  const cfg = settingsRepo.getAll();
  const displays = screen.getAllDisplays();
  const lastId = cfg.pillLastDisplayId;
  let target = displays.find((d) => String(d.id) === lastId) ?? screen.getPrimaryDisplay();
  const targetId = String(target.id);
  const saved = cfg.pillPositions[targetId];
  if (saved) {
    return { x: saved.x, y: saved.y, displayId: targetId };
  }
  const { workArea } = target;
  return {
    x: workArea.x + workArea.width - PILL_W - PILL_MARGIN,
    y: workArea.y + PILL_MARGIN,
    displayId: targetId,
  };
}

export function ensurePill(): BrowserWindow {
  if (state.pill && !state.pill.isDestroyed()) return state.pill;
  const pos = pickPillPosition();

  const win = createWindow({
    kind: 'pill',
    width: PILL_W,
    height: PILL_H,
    x: pos.x,
    y: pos.y,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    focusable: true,
    title: 'Attensi Time Tracker',
  });
  win.setAlwaysOnTop(true, 'floating');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });

  win.on('move', () => {
    if (win.isDestroyed()) return;
    const [x, y] = win.getPosition();
    const display = screen.getDisplayNearestPoint({ x, y });
    const displayId = String(display.id);
    const cfg = settingsRepo.getAll();
    settingsRepo.patch({
      pillPositions: { ...cfg.pillPositions, [displayId]: { x, y } },
      pillLastDisplayId: displayId,
    });
  });

  win.on('closed', () => {
    state.pill = null;
  });

  state.pill = win;
  return win;
}

export function pillResize(state2: 'collapsed' | 'dump'): void {
  const win = state.pill;
  if (!win || win.isDestroyed()) return;
  const target = state2 === 'dump' ? PILL_DUMP_H : PILL_H;
  const [w] = win.getSize();
  win.setSize(w, target, true);
}

export function setPillPosition(displayId: string, x: number, y: number): void {
  const cfg = settingsRepo.getAll();
  settingsRepo.patch({
    pillPositions: { ...cfg.pillPositions, [displayId]: { x, y } },
    pillLastDisplayId: displayId,
  });
  const win = state.pill;
  if (win && !win.isDestroyed()) win.setPosition(x, y);
}

export function showPill(): void {
  const win = ensurePill();
  if (!win.isVisible()) win.show();
  settingsRepo.patch({ pillVisible: true });
}

export function hidePill(): void {
  const win = state.pill;
  if (!win || win.isDestroyed()) return;
  win.hide();
  settingsRepo.patch({ pillVisible: false });
}

export function togglePill(): void {
  const win = state.pill;
  if (!win || win.isDestroyed()) {
    showPill();
    return;
  }
  if (win.isVisible()) hidePill();
  else showPill();
}

// ── Expanded ───────────────────────────────────────────────────────────────
export function ensureExpanded(): BrowserWindow {
  if (state.expanded && !state.expanded.isDestroyed()) return state.expanded;
  const win = createWindow({
    kind: 'expanded',
    width: 460,
    height: 640,
    minWidth: 420,
    minHeight: 520,
    frame: false,
    transparent: false,
    title: 'Attensi Time Tracker',
  });
  win.on('closed', () => {
    state.expanded = null;
  });
  state.expanded = win;
  return win;
}

export function toggleExpanded(): void {
  const win = state.expanded;
  if (!win || win.isDestroyed()) {
    ensureExpanded();
    return;
  }
  if (win.isVisible() && win.isFocused()) win.hide();
  else { win.show(); win.focus(); }
}

// ── Dashboard ──────────────────────────────────────────────────────────────
export function ensureDashboard(): BrowserWindow {
  if (state.dashboard && !state.dashboard.isDestroyed()) return state.dashboard;
  const win = createWindow({
    kind: 'dashboard',
    width: 980,
    height: 760,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    transparent: false,
    title: 'Attensi · Dashboard',
  });
  win.on('closed', () => {
    state.dashboard = null;
  });
  state.dashboard = win;
  return win;
}

// ── Intro ──────────────────────────────────────────────────────────────────
export function ensureIntro(): BrowserWindow {
  if (state.intro && !state.intro.isDestroyed()) return state.intro;
  const win = createWindow({
    kind: 'intro',
    width: 540,
    height: 660,
    frame: false,
    transparent: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    title: 'Welcome',
  });
  win.on('closed', () => {
    state.intro = null;
  });
  state.intro = win;
  return win;
}

export function closeIntro(): void {
  if (state.intro && !state.intro.isDestroyed()) {
    state.intro.close();
    state.intro = null;
  }
}

// ── Settings panel (own window) ────────────────────────────────────────────
export function ensureSettings(): BrowserWindow {
  if (state.settings && !state.settings.isDestroyed()) {
    state.settings.show();
    state.settings.focus();
    return state.settings;
  }
  const win = createWindow({
    kind: 'settings',
    width: 560,
    height: 640,
    frame: false,
    transparent: false,
    resizable: true,
    title: 'Settings',
  });
  win.on('closed', () => {
    state.settings = null;
  });
  state.settings = win;
  return win;
}

// ── Cheatsheet (overlay) ───────────────────────────────────────────────────
export function ensureCheatsheet(): BrowserWindow {
  if (state.cheatsheet && !state.cheatsheet.isDestroyed()) {
    state.cheatsheet.show();
    state.cheatsheet.focus();
    return state.cheatsheet;
  }
  const win = createWindow({
    kind: 'cheatsheet',
    width: 480,
    height: 520,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    title: 'Shortcuts',
  });
  win.on('closed', () => {
    state.cheatsheet = null;
  });
  state.cheatsheet = win;
  return win;
}

// ── Toasts ─────────────────────────────────────────────────────────────────
export type ToastKind = 'slack' | 'teams' | 'idle_recover' | 'retro_fill';

const TOAST_DIMENSIONS: Record<ToastKind, { w: number; h: number }> = {
  slack:        { w: 360, h: 110 },
  teams:        { w: 360, h: 110 },
  idle_recover: { w: 360, h: 280 },
  retro_fill:   { w: 380, h: 380 },
};

export function spawnToast(kind: ToastKind): BrowserWindow {
  const existing = state.toasts.get(kind);
  if (existing && !existing.isDestroyed()) {
    existing.show();
    existing.focus();
    return existing;
  }
  const dims = TOAST_DIMENSIONS[kind];
  const display = screen.getPrimaryDisplay();
  const wa = display.workArea;
  const x = wa.x + wa.width - dims.w - 16;
  const y = wa.y + wa.height - dims.h - 16;
  const win = createWindow({
    kind: 'toast',
    width: dims.w,
    height: dims.h,
    x,
    y,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: true,
    title: `Attensi · ${kind}`,
    search: { toast: kind },
  });
  win.on('closed', () => {
    state.toasts.delete(kind);
  });
  state.toasts.set(kind, win);
  return win;
}

export function closeToast(kind: ToastKind): void {
  const w = state.toasts.get(kind);
  if (w && !w.isDestroyed()) w.close();
}

// ── Integration panels ─────────────────────────────────────────────────────
export type IntegrationId = 'linear';

export function ensureIntegration(id: IntegrationId): BrowserWindow {
  const existing = state.integrations.get(id);
  if (existing && !existing.isDestroyed()) {
    existing.show();
    existing.focus();
    return existing;
  }
  const win = createWindow({
    kind: 'integration',
    width: 380,
    height: 460,
    frame: false,
    transparent: false,
    resizable: false,
    skipTaskbar: false,
    title: `Attensi · Integration · ${id}`,
    search: { integration: id },
  });
  win.on('closed', () => {
    state.integrations.delete(id);
  });
  state.integrations.set(id, win);
  return win;
}

export function getWindow(
  kind: 'pill' | 'expanded' | 'dashboard' | 'intro' | 'settings' | 'cheatsheet'
): BrowserWindow | null {
  return state[kind];
}

export function listAllWindows(): BrowserWindow[] {
  const list: BrowserWindow[] = [];
  for (const k of ['pill', 'expanded', 'dashboard', 'intro', 'settings', 'cheatsheet'] as const) {
    if (state[k] && !state[k]!.isDestroyed()) list.push(state[k]!);
  }
  for (const t of state.toasts.values()) if (!t.isDestroyed()) list.push(t);
  for (const i of state.integrations.values()) if (!i.isDestroyed()) list.push(i);
  return list;
}

export function attachDisplayWatcher(): void {
  const reposition = (): void => {
    const win = state.pill;
    if (!win || win.isDestroyed()) return;
    const pos = pickPillPosition();
    win.setBounds({ x: pos.x, y: pos.y, width: PILL_W, height: win.getBounds().height });
  };
  screen.on('display-removed', reposition);
  screen.on('display-added', reposition);
  screen.on('display-metrics-changed', reposition);
}

/** Apply the given settings to existing pill (visibility, position). */
export function applyPillSettings(s: Settings): void {
  if (!s.pillVisible) hidePill();
}
