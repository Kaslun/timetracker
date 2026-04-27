import type { FillSuggestion } from "@shared/types";
import { getProviderRegistry } from "../integrations/registry";

/**
 * Returns retroactive-fill suggestions for the current gap.
 *
 * Suggestions come from connected integrations only — no mocks, no seed
 * data. With zero connected providers the result is an empty array, which
 * the UI renders as the "Nothing to fill" empty state.
 */
export function getFillSuggestions(): FillSuggestion[] {
  const reg = getProviderRegistry();
  return reg
    .connectedProviders()
    .flatMap((p) => p.fetchActivity())
    .map((s, i) => ({ ...s, id: `fill_${i}` }));
}
