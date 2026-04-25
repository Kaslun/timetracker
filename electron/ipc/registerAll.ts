import { register } from './handlers';
import { broadcast } from './events';
import {
  projects,
  tasks,
  entries,
  captures,
  nudges,
  settings,
} from '../db/repos';
import { getFillSuggestions } from '../services/fillSuggestions';
import { exportCsv } from '../services/csv';
import { setAutoLaunch } from '../services/autolaunch';
import { getActiveNudge, clearNudge } from '../services/idle';
import { rebuildMenu as rebuildTrayMenu } from '../services/tray';
import {
  ensureExpanded,
  toggleExpanded,
  ensureDashboard,
  ensureSettings,
  ensureCheatsheet,
  ensureIntegration,
  showPill,
  hidePill,
  closeIntro,
  setPillPosition,
  pillResize,
  spawnToast,
} from '../windows/manager';
import { BrowserWindow } from 'electron';

function broadcastChanges(opts: {
  current?: boolean;
  tasks?: boolean;
  entries?: boolean;
  captures?: boolean;
  settings?: boolean;
}): void {
  if (opts.current)  broadcast('current:changed', entries.currentView());
  if (opts.tasks)    broadcast('tasks:changed', tasks.listWithStats());
  if (opts.entries)  {
    const since = Date.now() - 14 * 24 * 60 * 60 * 1000;
    broadcast('entries:changed', entries.list({ from: since }));
  }
  if (opts.captures) broadcast('captures:changed', captures.list());
  if (opts.settings) broadcast('settings:changed', settings.getAll());
}

export function registerAll(): void {
  register('app:bootstrap', () => {
    const since = Date.now() - 14 * 24 * 60 * 60 * 1000;
    return {
      settings: settings.getAll(),
      current: entries.currentView(),
      tasks: tasks.listWithStats(),
      todayEntries: entries.list({ from: since }),
      captures: captures.list(),
      projects: projects.list(),
      fillSuggestions: getFillSuggestions(),
      platform: process.platform === 'darwin' ? 'mac' : process.platform === 'linux' ? 'linux' : 'win',
    };
  });

  register('task:start', ({ taskId }) => {
    entries.start({ taskId });
    broadcastChanges({ current: true, tasks: true, entries: true });
    return entries.currentView();
  });

  register('task:pause', () => {
    entries.pause();
    broadcastChanges({ current: true, tasks: true, entries: true });
    return entries.currentView();
  });

  register('task:toggle', () => {
    const cur = entries.open();
    if (cur) entries.pause();
    else {
      // start the most-recent task with logged time today, else first task
      const list = tasks.listWithStats();
      const target = list.find((t) => t.todaySec > 0) ?? list[0];
      if (target) entries.start({ taskId: target.id });
    }
    broadcastChanges({ current: true, tasks: true, entries: true });
    return entries.currentView();
  });

  register('task:switch', ({ taskId }) => {
    entries.start({ taskId });
    broadcastChanges({ current: true, tasks: true, entries: true });
    return entries.currentView();
  });

  register('task:current', () => entries.currentView());
  register('task:list', () => tasks.listWithStats());

  register('task:create', (input) => {
    const created = tasks.create(input);
    broadcastChanges({ tasks: true });
    return created;
  });
  register('task:archive', ({ id }) => {
    tasks.archive(id);
    broadcastChanges({ tasks: true, entries: true });
  });

  register('entry:list', (input) => entries.list(input));
  register('entry:update', ({ id, patch }) => {
    entries.update(id, patch);
    broadcastChanges({ current: true, tasks: true, entries: true });
  });
  register('entry:delete', ({ id }) => {
    entries.delete(id);
    broadcastChanges({ current: true, tasks: true, entries: true });
  });
  register('entry:insert', (input) => {
    const e = entries.insert(input);
    broadcastChanges({ tasks: true, entries: true });
    return e;
  });

  register('project:list', () => projects.list());

  register('capture:create', (input) => {
    const c = captures.create(input);
    broadcastChanges({ captures: true });
    return c;
  });
  register('capture:list', (input) => captures.list(input?.limit));
  register('capture:tag', ({ id, tag }) => {
    captures.tag(id, tag);
    broadcastChanges({ captures: true });
  });
  register('capture:archive', ({ id }) => {
    captures.archive(id);
    broadcastChanges({ captures: true });
  });

  register('settings:get', () => settings.getAll());
  register('settings:patch', (patch) => {
    const next = settings.patch(patch);
    if (patch.autoLaunch !== undefined) setAutoLaunch(patch.autoLaunch);
    broadcastChanges({ settings: true });
    rebuildTrayMenu();
    return next;
  });

  register('nudge:dismiss', ({ kind }) => {
    nudges.dismissed(kind);
    if (kind === 'idle_recover' || kind === 'retro_fill') clearNudge(kind);
  });
  register('nudge:active', ({ kind }) => getActiveNudge(kind));
  register('idle:resolve', ({ choice, gapStartedAt, gapEndedAt, taskId }) => {
    if (choice === 'discard') {
      nudges.dismissed('idle_recover');
      clearNudge('idle_recover');
      return;
    }
    if (choice === 'meeting') {
      // Insert a "meeting" entry against an Ops/Meeting placeholder task
      const all = tasks.list();
      const target = all.find((t) => t.tag === 'meet') ?? all[0];
      if (target) entries.insert({ taskId: taskId ?? target.id, startedAt: gapStartedAt, endedAt: gapEndedAt, source: 'idle_recover' });
    } else if (choice === 'keep') {
      if (taskId) entries.insert({ taskId, startedAt: gapStartedAt, endedAt: gapEndedAt, source: 'idle_recover' });
    } else if (choice === 'custom') {
      // Renderer will follow up with explicit entry:insert calls; nothing to do here
    }
    nudges.dismissed('idle_recover');
    clearNudge('idle_recover');
    broadcastChanges({ tasks: true, entries: true });
  });

  register('fill:suggestions', () => getFillSuggestions());
  register('fill:apply', ({ suggestions }) => {
    let inserted = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const s of suggestions) {
      if (!s.taskId) continue;
      const [hh, mm] = s.at.split(':').map(Number);
      const startedAt = new Date(today);
      startedAt.setHours(hh ?? 0, mm ?? 0, 0, 0);
      const endedAt = new Date(startedAt.getTime() + s.durationMinutes * 60_000);
      entries.insert({
        taskId: s.taskId,
        startedAt: startedAt.getTime(),
        endedAt: endedAt.getTime(),
        source: 'fill',
      });
      inserted++;
    }
    broadcastChanges({ tasks: true, entries: true });
    return { inserted };
  });

  register('export:csv', async (input, ) => {
    const focused = BrowserWindow.getFocusedWindow();
    const result = await exportCsv(input, focused ?? undefined);
    return result;
  });

  register('window:openExpanded',   () => { ensureExpanded(); });
  register('window:toggleExpanded', () => { toggleExpanded(); });
  register('window:openDashboard',  () => { ensureDashboard(); });
  register('window:openSettings',   () => { ensureSettings(); });
  register('window:openCheatsheet', () => { ensureCheatsheet(); });
  register('window:openIntegration', ({ id }) => { ensureIntegration(id); });
  register('window:hidePill',       () => { hidePill(); });
  register('window:showPill',       () => { showPill(); });
  register('window:closeIntro',     (input) => {
    if (input) {
      settings.patch({
        userName: input.name ?? null,
        integrationsConnected: input.connected,
        firstRunComplete: true,
      });
      broadcastChanges({ settings: true });
    } else {
      settings.patch({ firstRunComplete: true });
      broadcastChanges({ settings: true });
    }
    closeIntro();
    showPill();
  });
  register('window:close', () => {
    BrowserWindow.getFocusedWindow()?.close();
  });
  register('window:setExpandedTab', ({ tab }) => {
    broadcast('expanded:tab', tab);
    ensureExpanded();
  });

  register('pill:setPosition', ({ displayId, x, y }) => {
    setPillPosition(displayId, x, y);
  });
  register('pill:resize', ({ state: s }) => {
    pillResize(s);
    broadcast('pill:state', s);
  });

  register('demo:toast', ({ kind }) => {
    spawnToast(kind);
  });

  register('autoLaunch:set', ({ enabled }) => {
    setAutoLaunch(enabled);
    settings.patch({ autoLaunch: enabled });
    broadcastChanges({ settings: true });
    rebuildTrayMenu();
  });
}
