/**
 * Danger-zone helpers exposed via Settings → General.
 *
 * `wipeLocalData` clears every domain table and most settings, but preserves
 * the user's connected integrations (both the `integrationsConnected` map and
 * the keychain tokens) so the user doesn't have to re-OAuth after a reset.
 *
 * `disconnectAllIntegrations` then handles the explicit "burn the keychain"
 * second step, with its own confirmation upstream.
 *
 * Both flows append a line to the local audit log before exiting.
 */
import { app } from "electron";
import { db } from "../db";
import { settings as settingsRepo } from "../db/repos";
import { getProviderRegistry } from "../integrations/registry";
import { audit } from "./audit";
import { logger } from "./logger";

const log = logger("wipe");

const PRESERVED_SETTINGS_KEYS = [
  "integrationsConnected",
  "firstRunComplete",
];

export interface WipeResult {
  /** Total rows removed across the data tables we cleared. */
  rowsRemoved: number;
}

/**
 * Truncate every domain table and most settings rows, restart the app cleanly.
 * Integration tokens (keychain) and the `integrationsConnected` map stay
 * intact — the user explicitly opted to keep providers connected.
 */
export function wipeLocalData(): WipeResult {
  const conn = db();
  let rowsRemoved = 0;
  const trx = conn.transaction(() => {
    const counts: Record<string, number> = {};
    for (const t of [
      "entries",
      "tasks",
      "projects",
      "captures",
      "nudges",
      "custom_tags",
    ]) {
      const row = conn.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as {
        n: number;
      };
      counts[t] = row.n;
      conn.prepare(`DELETE FROM ${t}`).run();
      rowsRemoved += row.n;
    }
    // Wipe settings except the preserved keys.
    const placeholders = PRESERVED_SETTINGS_KEYS.map(() => "?").join(",");
    conn
      .prepare(`DELETE FROM settings WHERE key NOT IN (${placeholders})`)
      .run(...PRESERVED_SETTINGS_KEYS);
    log.info("wiped tables", counts);
  });
  trx();

  audit("settings.wipeLocalData", {
    rowsRemoved,
    preservedSettingsKeys: PRESERVED_SETTINGS_KEYS,
  });

  // Defer the relaunch so the IPC reply has a chance to flush.
  setTimeout(() => {
    app.relaunch();
    app.exit(0);
  }, 250);

  return { rowsRemoved };
}

/**
 * Forget every connected integration: clear keychain tokens and the
 * `integrationsConnected` map. Caller is responsible for a separate confirm.
 */
export async function disconnectAllIntegrations(): Promise<{ disconnected: string[] }> {
  const registry = getProviderRegistry();
  const ids = registry.list().map((s) => s.id);
  const disconnected: string[] = [];
  for (const id of ids) {
    try {
      await registry.disconnect(id);
      disconnected.push(id);
    } catch (err) {
      log.warn(`disconnect(${id}) failed`, err);
    }
  }
  settingsRepo.patch({ integrationsConnected: {} });
  audit("settings.disconnectAllIntegrations", { disconnected });
  return { disconnected };
}
