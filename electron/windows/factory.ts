import { BrowserWindow, screen } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export type WindowKind =
  | 'pill'
  | 'expanded'
  | 'dashboard'
  | 'intro'
  | 'settings'
  | 'cheatsheet'
  | 'toast'
  | 'integration';

interface Options extends Omit<Electron.BrowserWindowConstructorOptions, 'webPreferences'> {
  kind: WindowKind;
  /** Extra query params appended after `?window=<kind>`. */
  search?: Record<string, string>;
}

function preloadPath(): string {
  return join(__dirname, '../preload/index.mjs');
}

function rendererBase(): { url: string | null; file: string | null } {
  if (process.env['ELECTRON_RENDERER_URL']) {
    return { url: process.env['ELECTRON_RENDERER_URL'], file: null };
  }
  return { url: null, file: join(__dirname, '../renderer/index.html') };
}

export function createWindow(opts: Options): BrowserWindow {
  const { kind, search = {}, ...rest } = opts;

  const win = new BrowserWindow({
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#00000000',
    ...rest,
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
    },
  });

  const params = new URLSearchParams({ window: kind, ...search }).toString();
  const { url, file } = rendererBase();
  if (url) {
    void win.loadURL(`${url}?${params}`);
  } else if (file) {
    void win.loadFile(file, { search: `?${params}` });
  }

  win.once('ready-to-show', () => {
    win.show();
  });

  return win;
}

export function getDisplayId(displayId: number | string | undefined): string {
  if (displayId == null) return String(screen.getPrimaryDisplay().id);
  return String(displayId);
}
