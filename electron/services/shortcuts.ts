import { globalShortcut } from 'electron';
import {
  ensureExpanded,
  ensurePill,
  togglePill,
  hidePill,
} from '../windows/manager';
import { broadcast } from '../ipc/events';
import { entries } from '../db/repos/entries';
import { tasks } from '../db/repos/tasks';
import { captures } from '../db/repos/captures';

interface Binding {
  accelerator: string;
  description: string;
  handler: () => void;
}

function broadcastChanges(): void {
  broadcast('current:changed', entries.currentView());
  broadcast('tasks:changed', tasks.listWithStats());
  const since = Date.now() - 14 * 24 * 60 * 60 * 1000;
  broadcast('entries:changed', entries.list({ from: since }));
  broadcast('captures:changed', captures.list());
}

const BINDINGS: Binding[] = [
  {
    accelerator: 'Control+Space',
    description: 'Start / pause timer',
    handler: () => {
      const cur = entries.open();
      if (cur) {
        entries.pause();
      } else {
        const list = tasks.listWithStats();
        const target = list.find((t) => t.todaySec > 0) ?? list[0];
        if (target) entries.start({ taskId: target.id });
      }
      broadcastChanges();
    },
  },
  {
    accelerator: 'Control+Shift+K',
    description: 'Brain dump (anywhere)',
    handler: () => {
      const pill = ensurePill();
      if (!pill.isVisible()) pill.show();
      pill.focus();
      broadcast('pill:focus-dump', undefined);
    },
  },
  {
    accelerator: 'Control+Shift+S',
    description: 'Switch task',
    handler: () => {
      ensureExpanded();
      broadcast('expanded:tab', 'list');
      broadcast('expanded:focus-search', undefined);
    },
  },
  {
    accelerator: 'Control+Shift+F',
    description: 'Fill gaps',
    handler: () => {
      ensureExpanded();
      broadcast('expanded:tab', 'fill');
    },
  },
  {
    accelerator: 'Control+Shift+P',
    description: 'Start focus sprint',
    handler: () => {
      ensureExpanded();
    },
  },
  {
    accelerator: 'Control+E',
    description: 'Expand / collapse pill',
    handler: () => {
      togglePill();
    },
  },
  {
    accelerator: 'Control+.',
    description: 'Hide pill',
    handler: () => {
      hidePill();
    },
  },
];

export function registerGlobalShortcuts(): void {
  unregisterGlobalShortcuts();
  for (const b of BINDINGS) {
    const ok = globalShortcut.register(b.accelerator, b.handler);
    if (!ok) {
      console.warn(`[shortcuts] failed to register ${b.accelerator} (${b.description})`);
    }
  }
}

export function unregisterGlobalShortcuts(): void {
  globalShortcut.unregisterAll();
}
