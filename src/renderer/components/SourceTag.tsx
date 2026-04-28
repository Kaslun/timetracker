/**
 * Small chip that shows where a task came from (Local / Linear / Jira / …).
 *
 * Used wherever a task is rendered: Tasks tab, Projects drill-in, Task
 * picker, Timeline tooltip, Pill task chip. Driven entirely by the shared
 * registry in `src/shared/integrations/registry.ts` so adding a new
 * provider is a one-file change.
 *
 * Click behaviour:
 *   - Local tasks: no link, no click handler, neutral grey chip.
 *   - Integration tasks with an `externalUrl`: button that opens the URL in
 *     the user's default browser via the `shell:openUrl` IPC channel.
 *   - Integration tasks without an `externalUrl` (Slack DMs, Teams events
 *     for which we don't have a public link): non-interactive chip.
 *
 * The chip is colour-themed using `color-mix` against `--surface` so it
 * blends with both light and dark themes without per-theme overrides.
 */
import type { TaskWithProject } from "@shared/types";
import {
  INTEGRATION_META,
  sourceColor,
  sourceLabel,
  taskSource,
  type TaskSource,
} from "@shared/integrations/registry";
import { rpc } from "@/lib/api";

interface SourceTagProps {
  /**
   * The task this chip is attached to. We accept the broader
   * `TaskWithProject` shape because every render site already has it; the
   * chip only reads `integrationId` and (optionally) `externalUrl`.
   */
  task: Pick<TaskWithProject, "integrationId" | "externalUrl">;
  /** Compact icon-only mode (used in the pill task chip). */
  compact?: boolean;
  /**
   * Show a small "↗" arrow to hint that the chip opens an external URL.
   * Defaults to true for chips with a link, false for local chips.
   */
  showArrow?: boolean;
}

export function SourceTag({
  task,
  compact = false,
  showArrow,
}: SourceTagProps) {
  const source = taskSource(task.integrationId);
  const label = sourceLabel(source);
  const color = sourceColor(source);
  const url = task.externalUrl ?? null;
  const meta = source === "local" ? null : INTEGRATION_META[source];
  const arrow = showArrow ?? !!url;

  const onClick = (e: React.MouseEvent): void => {
    if (!url) return;
    e.stopPropagation();
    e.preventDefault();
    void rpc("shell:openUrl", { url });
  };

  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    padding: compact ? "0 4px" : "1px 6px",
    height: compact ? 13 : 15,
    fontSize: compact ? 8 : 9,
    fontWeight: 600,
    letterSpacing: "0.02em",
    borderRadius: 999,
    flexShrink: 0,
    // Brand-tinted surface that adapts to theme via color-mix.
    background: `color-mix(in oklab, ${color} 14%, var(--surface))`,
    color: `color-mix(in oklab, ${color} 70%, var(--ink))`,
    border: `1px solid color-mix(in oklab, ${color} 30%, var(--line))`,
    cursor: url ? "pointer" : "default",
    userSelect: "none",
  };

  const title = url
    ? `Open in ${label}`
    : meta
      ? `${label} task`
      : "Local task";

  if (url) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        aria-label={title}
        style={{ ...baseStyle, fontFamily: "inherit" }}
      >
        <SourceGlyph source={source} compact={compact} />
        {!compact && <span>{label}</span>}
        {arrow && !compact ? <span style={{ opacity: 0.6 }}>↗</span> : null}
      </button>
    );
  }

  return (
    <span title={title} style={baseStyle}>
      <SourceGlyph source={source} compact={compact} />
      {!compact && <span>{label}</span>}
    </span>
  );
}

function SourceGlyph({
  source,
  compact,
}: {
  source: TaskSource;
  compact: boolean;
}) {
  const letter = source === "local" ? "·" : INTEGRATION_META[source].letter;
  return (
    <span
      aria-hidden="true"
      style={{
        fontSize: compact ? 7 : 8,
        opacity: 0.85,
        // Tabular-numerals trick: line up the glyph height with the label.
        lineHeight: 1,
      }}
    >
      {letter}
    </span>
  );
}
