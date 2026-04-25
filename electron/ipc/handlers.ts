import { ipcMain } from 'electron';
import type { z } from 'zod';
import { CHANNELS, type ChannelName } from '../shared/ipc';

type Handler<C extends ChannelName> = (
  input: z.infer<(typeof CHANNELS)[C][0]>
) => Promise<z.infer<(typeof CHANNELS)[C][1]>> | z.infer<(typeof CHANNELS)[C][1]>;

type AnyHandler = (input: unknown) => Promise<unknown> | unknown;

const REGISTRY = new Map<ChannelName, AnyHandler>();

export function register<C extends ChannelName>(channel: C, handler: Handler<C>): void {
  REGISTRY.set(channel, handler as unknown as AnyHandler);
}

export function attachHandlers(): void {
  for (const [channel, handler] of REGISTRY.entries()) {
    const [inputSchema, outputSchema] = CHANNELS[channel];
    ipcMain.handle(channel, async (_e, raw) => {
      const parsedIn = inputSchema.safeParse(raw);
      if (!parsedIn.success) {
        console.error(`[ipc] ${channel} input invalid`, parsedIn.error.issues);
        throw new Error(`Invalid input for ${channel}`);
      }
      const result = await handler(parsedIn.data);
      const parsedOut = outputSchema.safeParse(result);
      if (!parsedOut.success) {
        console.error(`[ipc] ${channel} output invalid`, parsedOut.error.issues);
        throw new Error(`Invalid output for ${channel}`);
      }
      return parsedOut.data;
    });
  }
}
