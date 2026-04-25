import { Menu, app } from 'electron';
import {
  ensureExpanded,
  ensureDashboard,
  ensureSettings,
  ensureCheatsheet,
  ensureIntegration,
  showPill,
  hidePill,
  spawnToast,
} from '../windows/manager';
import { settings } from '../db/repos/settings';

export function buildAppMenu(): void {
  const cfg = settings.getAll();

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '&File',
      submenu: [
        {
          label: 'Show pill',
          accelerator: 'Control+Shift+H',
          click: () => showPill(),
        },
        {
          label: 'Hide pill',
          accelerator: 'Control+.',
          click: () => hidePill(),
        },
        { type: 'separator' },
        {
          label: 'Settings…',
          click: () => ensureSettings(),
        },
        { type: 'separator' },
        { role: 'quit', label: 'Quit' },
      ],
    },
    {
      label: '&View',
      submenu: [
        {
          label: 'Expanded',
          accelerator: 'Control+E',
          click: () => ensureExpanded(),
        },
        {
          label: 'Dashboard',
          accelerator: 'Control+D',
          click: () => ensureDashboard(),
        },
        {
          label: 'Cheatsheet',
          accelerator: 'F1',
          click: () => ensureCheatsheet(),
        },
        { type: 'separator' },
        {
          label: 'Demo',
          submenu: [
            { label: 'Slack toast',          click: () => spawnToast('slack') },
            { label: 'Teams toast',          click: () => spawnToast('teams') },
            { label: 'Idle recovery toast',  click: () => spawnToast('idle_recover') },
            { label: 'Retro fill toast',     click: () => spawnToast('retro_fill') },
            { type: 'separator' },
            { label: 'Linear integration',   click: () => ensureIntegration('linear') },
          ],
        },
        ...(process.env['NODE_ENV'] !== 'production'
          ? [
              { type: 'separator' as const },
              { role: 'reload' as const },
              { role: 'forceReload' as const },
              { role: 'toggleDevTools' as const },
            ]
          : []),
      ],
    },
    {
      label: '&Help',
      submenu: [
        {
          label: 'Keyboard shortcuts',
          accelerator: 'F1',
          click: () => ensureCheatsheet(),
        },
        {
          label: `About ${app.getName()}`,
          click: () => {
            // Future: spawn about window
          },
        },
      ],
    },
  ];

  void cfg;
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
