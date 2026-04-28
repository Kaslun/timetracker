import { getProviderRegistry } from "../integrations/registry";
import { runTempoSync } from "../integrations/tempo";
import { getDebugStats } from "../integrations/httpClient";
import { register } from "./handlers";

/**
 * Integration channel surface:
 *
 * Setup channels (existing):
 * - `integration:list`         current state of every known provider.
 * - `integration:connect`      validate token + persist secret.
 * - `integration:disconnect`   revoke locally.
 *
 * Sync + budget channels (round-5):
 * - `integration:refresh`      manual fetch (bypasses 5-min freshness floor).
 * - `integration:tempoSync`    push timeline → Tempo worklogs (idempotent).
 * - `integration:debugStats`   per-provider request/cache stats for debug UI.
 *
 * Real-time updates flow over the `integrations:changed` event broadcast by
 * the registry whenever any of these mutate, so the UI never has to poll.
 */
export function registerIntegrations(): void {
  register("integration:list", () => getProviderRegistry().list());

  register("integration:connect", async ({ id, token, workspace, scopes }) => {
    return getProviderRegistry().connect(id, {
      token,
      workspace: workspace ?? null,
      scopes: scopes ?? [],
    });
  });

  register("integration:disconnect", async ({ id }) => {
    return getProviderRegistry().disconnect(id);
  });

  register("integration:refresh", async ({ id }) => {
    try {
      const before = getProviderRegistry().listTaskCount(id);
      await getProviderRegistry().refresh(id);
      const after = getProviderRegistry().listTaskCount(id);
      return {
        ok: true,
        tasksAdded: Math.max(0, after - before),
        throttled: false,
        message: null,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        tasksAdded: 0,
        throttled: msg.includes("Rate-limited"),
        message: msg,
      };
    }
  });

  register("integration:tempoSync", async ({ dryRun }) => {
    return runTempoSync({ dryRun });
  });

  register("integration:debugStats", () => getDebugStats());
}
