/**
 * Canonical tab list and ordering helpers for the expanded window.
 *
 * `DEFAULT_TAB_ORDER` is the source of truth for both the renderer (which
 * paints the tab bar) and Settings → General (the "Reset tab order" button).
 *
 * Tabs persist as `settings.expandedTabOrder` — a permutation of these IDs.
 * If the persisted array drops a known id (e.g. after a release that adds a
 * new tab) the missing ids get appended at the end so users always see every
 * available surface without losing the rest of their custom ordering.
 */
import type { TabId } from "./Tabs";

export const DEFAULT_TAB_ORDER: TabId[] = [
  "timeline",
  "list",
  "inbox",
  "fill",
  "projects",
];

export const TAB_LABELS: Record<TabId, string> = {
  timeline: "Timeline",
  list: "Tasks",
  inbox: "Inbox",
  fill: "Fill gaps",
  projects: "Projects",
};

/**
 * Reconcile a stored permutation with the canonical list. Drops unknown ids,
 * appends ones that are new since the order was last saved, and returns a
 * fresh array (callers can mutate freely).
 */
export function normaliseTabOrder(stored: readonly TabId[] | null | undefined): TabId[] {
  const known = new Set<TabId>(DEFAULT_TAB_ORDER);
  const seen = new Set<TabId>();
  const out: TabId[] = [];
  for (const id of stored ?? []) {
    if (known.has(id) && !seen.has(id)) {
      out.push(id);
      seen.add(id);
    }
  }
  for (const id of DEFAULT_TAB_ORDER) {
    if (!seen.has(id)) out.push(id);
  }
  return out;
}
