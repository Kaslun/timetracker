/**
 * Per-window responsive breakpoints.
 *
 * Round 4 introduced fluid window sizing (no fixed widths). The expanded view,
 * dashboard, and settings windows can each be resized between their declared
 * minimums and fullscreen, so we measure the actual container width via
 * `useContainerWidth` and feed it through `classifyWidth` to pick a layout.
 *
 * Bands:
 *   • compact (< 520px) — sidebars collapse to icon-only, two-column → one
 *   • default (520–820) — current designs apply
 *   • wide    (> 820)   — denser grids, side detail panes
 *
 * `0` (the pre-measure value emitted before ResizeObserver fires) maps to
 * `default` to avoid a frame of compact-mode layout flash on mount.
 */
export type Breakpoint = "compact" | "default" | "wide";

export function classifyWidth(w: number): Breakpoint {
  if (w === 0) return "default";
  if (w < 520) return "compact";
  if (w > 820) return "wide";
  return "default";
}
