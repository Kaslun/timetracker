/**
 * First-run seed.
 *
 * v2 ships with a genuine empty state — no demo projects, tasks, entries or
 * captures. The UI should render its empty-state copy until the user logs a
 * task or connects an integration. This module is intentionally a near-no-op
 * so first launch matches the user's actual onboarding experience.
 */
export function seedIfEmpty(): void {
  // No-op: a fresh install boots empty. Demo content lived here historically;
  // it now belongs to the integration providers (see src/main/integrations/).
}
