import { getProviderRegistry } from "../integrations/registry";
import { register } from "./handlers";

/**
 * Three-channel surface area:
 * - `integration:list` returns the canonical state for every known provider.
 * - `integration:connect` validates credentials and persists the token.
 * - `integration:disconnect` revokes locally — purges DB rows + clears keychain.
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
}
