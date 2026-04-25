import type {
  ChannelName,
  ChannelInput,
  ChannelOutput,
  EventName,
  EventPayload,
} from "@shared/schemas";

interface AttensiBridge {
  windowKind:
    | "pill"
    | "expanded"
    | "dashboard"
    | "intro"
    | "toast"
    | "settings"
    | "cheatsheet"
    | "integration";
  toastKind: "slack" | "teams" | "idle_recover" | "retro_fill" | null;
  integrationId: "linear" | null;
  invoke<C extends ChannelName>(channel: C, input?: unknown): Promise<unknown>;
  on(event: EventName, cb: (payload: unknown) => void): () => void;
}

declare global {
  interface Window {
    attensi: AttensiBridge;
  }
}

type RpcInput<C extends ChannelName> =
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  [ChannelInput<C>] extends [void]
    ? [channel: C]
    : [channel: C, input: ChannelInput<C>];

export async function rpc<C extends ChannelName>(
  ...args: RpcInput<C>
): Promise<ChannelOutput<C>> {
  const [channel, input] = args as [C, ChannelInput<C>];
  return (await window.attensi.invoke(channel, input)) as ChannelOutput<C>;
}

export function on<E extends EventName>(
  event: E,
  cb: (payload: EventPayload<E>) => void,
): () => void {
  return window.attensi.on(event, (payload) => cb(payload as EventPayload<E>));
}

export const windowKind = (): AttensiBridge["windowKind"] =>
  window.attensi.windowKind;
export const toastKind = (): AttensiBridge["toastKind"] =>
  window.attensi.toastKind;
export const integrationId = (): AttensiBridge["integrationId"] =>
  window.attensi.integrationId;
