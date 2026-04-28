/**
 * Background refresh scheduler for connected integrations.
 *
 * Cadence:
 *   - Every 15 min, iterate connected providers and trigger
 *     `registry.refresh(id)`. This is the polite default; the underlying
 *     `httpClient.request` deduplicates with the cache.
 *   - On window focus (any renderer regaining focus), trigger an
 *     opportunistic refresh — but skip if the cache is younger than
 *     `CACHE_FOCUS_FLOOR_MS` (5 min). The manual "Refresh" IPC bypasses
 *     this floor.
 *
 * Errors per-provider are caught + logged so one flaky integration
 * doesn't sink the whole sweep.
 */
import { app } from "electron";
import {
  CACHE_BG_INTERVAL_MS,
  CACHE_FOCUS_FLOOR_MS,
  integrationCache,
} from "../integrations/cache";
import { getProviderRegistry } from "../integrations/registry";
import { logger } from "./logger";

const log = logger("integrationRefresh");

let bgTimer: NodeJS.Timeout | null = null;
let focusHandlerInstalled = false;

export function startIntegrationRefresh(): void {
  if (bgTimer) clearInterval(bgTimer);
  bgTimer = setInterval(() => {
    void sweep("background");
  }, CACHE_BG_INTERVAL_MS);

  if (!focusHandlerInstalled) {
    app.on("browser-window-focus", () => {
      void sweep("focus");
    });
    focusHandlerInstalled = true;
  }
}

export function stopIntegrationRefresh(): void {
  if (bgTimer) {
    clearInterval(bgTimer);
    bgTimer = null;
  }
}

async function sweep(reason: "background" | "focus"): Promise<void> {
  const registry = getProviderRegistry();
  const connected = registry.list().filter((s) => s.status === "connected");
  for (const s of connected) {
    if (reason === "focus" && !staleEnough(s.id)) continue;
    try {
      await registry.refresh(s.id);
    } catch (e) {
      log.error(`refresh ${s.id} failed`, e);
    }
  }
}

/**
 * Decide whether the focus-triggered refresh should pull fresh data for
 * one provider. Returns true if any cached resource is older than the
 * focus floor — we err on the side of refreshing if the provider has no
 * cache rows at all (first connect race).
 */
function staleEnough(provider: string): boolean {
  const rows = integrationCache.list().filter((r) => r.provider === provider);
  if (rows.length === 0) return true;
  const newest = rows.reduce((acc, r) => Math.max(acc, r.updatedAt), 0);
  return Date.now() - newest > CACHE_FOCUS_FLOOR_MS;
}
