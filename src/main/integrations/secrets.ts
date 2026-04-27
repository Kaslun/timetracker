/**
 * Thin keytar wrapper.
 *
 * All integration tokens are stored in the OS keychain (Windows Credential
 * Manager / macOS Keychain / libsecret on Linux). Loading is best-effort:
 * if the native module fails to load (CI, missing libsecret on a dev box),
 * we fall back to an in-memory map so the rest of the app can still boot.
 *
 * The fallback is logged loudly so it never silently downgrades a release
 * build.
 */
import type { IntegrationId } from "@shared/types";
import { logger } from "../services/logger";

const log = logger("secrets");
const SERVICE = "AttensiTimeTracker.integrations";

interface KeytarLike {
  getPassword(service: string, account: string): Promise<string | null>;
  setPassword(
    service: string,
    account: string,
    password: string,
  ): Promise<void>;
  deletePassword(service: string, account: string): Promise<boolean>;
}

let keytar: KeytarLike | null = null;
let attempted = false;

const memoryFallback = new Map<string, string>();

async function loadKeytar(): Promise<KeytarLike | null> {
  if (attempted) return keytar;
  attempted = true;
  try {
    const mod = (await import("keytar")) as unknown as {
      default?: KeytarLike;
    } & KeytarLike;
    keytar = mod.default ?? mod;
    return keytar;
  } catch (err) {
    log.warn(
      "keytar unavailable — falling back to in-memory secret store",
      err,
    );
    keytar = null;
    return null;
  }
}

export async function readSecret(id: IntegrationId): Promise<string | null> {
  const k = await loadKeytar();
  if (!k) return memoryFallback.get(id) ?? null;
  try {
    return await k.getPassword(SERVICE, id);
  } catch (err) {
    log.error(`getPassword(${id}) failed`, err);
    return null;
  }
}

export async function writeSecret(
  id: IntegrationId,
  token: string,
): Promise<void> {
  const k = await loadKeytar();
  if (!k) {
    memoryFallback.set(id, token);
    return;
  }
  try {
    await k.setPassword(SERVICE, id, token);
  } catch (err) {
    log.error(`setPassword(${id}) failed — using memory fallback`, err);
    memoryFallback.set(id, token);
  }
}

export async function deleteSecret(id: IntegrationId): Promise<void> {
  memoryFallback.delete(id);
  const k = await loadKeytar();
  if (!k) return;
  try {
    await k.deletePassword(SERVICE, id);
  } catch (err) {
    log.error(`deletePassword(${id}) failed`, err);
  }
}
