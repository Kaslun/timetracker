export type Platform = 'win' | 'mac' | 'linux';

export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'win';
  const p = navigator.platform.toLowerCase();
  if (p.includes('mac')) return 'mac';
  if (p.includes('linux')) return 'linux';
  return 'win';
}

interface Shortcut {
  /** Mac glyph form, e.g. "⌘ ⇧ K" — used as the symbolic key. */
  mac: string;
  /** Windows form, e.g. "Ctrl+Shift+K" — used for global registration. */
  win: string;
  /** Display label for the cheatsheet under Windows. */
  label?: string;
}

export const SHORTCUTS = {
  toggleTimer:    { mac: '⌘ ␣',     win: 'Ctrl+Space' },
  brainDump:      { mac: '⌘ ⇧ K',   win: 'Ctrl+Shift+K' },
  switchTask:     { mac: '⌘ ⇧ S',   win: 'Ctrl+Shift+S' },
  expandPill:     { mac: '⌘ E',     win: 'Ctrl+E' },
  taskSearch:     { mac: '⌘ K',     win: 'Ctrl+K' },
  fillGaps:       { mac: '⌘ ⇧ F',   win: 'Ctrl+Shift+F' },
  focusSprint:    { mac: '⌘ ⇧ P',   win: 'Ctrl+Shift+P' },
  hidePill:       { mac: '⌘ .',     win: 'Ctrl+.' },
  tagLastCapture: { mac: '⌘ ⇧ T',   win: 'Ctrl+Shift+T' },
  bodyDoubling:   { mac: '⌘ ⇧ B',   win: 'Ctrl+Shift+B' },
  cheatsheet:     { mac: '?',       win: '?' },
  dismiss:        { mac: '⎋',       win: 'Esc' },
} as const satisfies Record<string, Shortcut>;

export type ShortcutKey = keyof typeof SHORTCUTS;

export function shortcutLabel(key: ShortcutKey, platform: Platform = detectPlatform()): string {
  const s = SHORTCUTS[key];
  if (platform === 'mac') return s.mac;
  return s.win.replace(/Ctrl/g, 'Ctrl').replace(/\+/g, ' ');
}

export function globalAccelerator(key: ShortcutKey, platform: Platform = 'win'): string {
  const s = SHORTCUTS[key];
  if (platform === 'mac') return s.win.replace('Ctrl', 'Cmd');
  return s.win;
}
