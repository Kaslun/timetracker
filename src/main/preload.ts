import { contextBridge, ipcRenderer } from "electron";
import type { ChannelName, EventName } from "@shared/schemas";

interface AttensiApi {
  windowKind:
    | "pill"
    | "expanded"
    | "dashboard"
    | "intro"
    | "toast"
    | "settings"
    | "cheatsheet"
    | "integration"
    | "eod";
  toastKind: "slack" | "teams" | "idle_recover" | "retro_fill" | null;
  integrationId: "linear" | null;
  invoke<C extends ChannelName>(channel: C, input?: unknown): Promise<unknown>;
  on(event: EventName, cb: (payload: unknown) => void): () => void;
}

const url = new URL(window.location.href);
const windowKind =
  (url.searchParams.get("window") as AttensiApi["windowKind"]) ?? "expanded";
const toastKind =
  (url.searchParams.get("toast") as AttensiApi["toastKind"]) ?? null;
const integrationId =
  (url.searchParams.get("integration") as AttensiApi["integrationId"]) ?? null;

const api: AttensiApi = {
  windowKind,
  toastKind,
  integrationId,
  invoke(channel, input) {
    return ipcRenderer.invoke(channel, input);
  },
  on(event, cb) {
    const listener = (_e: Electron.IpcRendererEvent, payload: unknown): void =>
      cb(payload);
    ipcRenderer.on(event, listener);
    return () => {
      ipcRenderer.removeListener(event, listener);
    };
  },
};

contextBridge.exposeInMainWorld("attensi", api);
