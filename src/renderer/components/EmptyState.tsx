import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  hint?: ReactNode;
  /** Right-aligned cluster, typically a CTA button. */
  action?: ReactNode;
  /** Symbol or small icon rendered above the title. Single character or
   *  minimal SVG keeps the surface calm. */
  icon?: ReactNode;
}

/**
 * Quiet empty-state slate.
 *
 * Used on the timeline, inbox, fill-gaps and dashboard tabs when there's no
 * data yet. Stays neutral (`--ink-3`) so it never reads as an error and gives
 * the eye somewhere to rest.
 */
export function EmptyState({ title, hint, action, icon }: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        textAlign: "center",
        color: "var(--ink-3)",
        gap: 8,
      }}
    >
      {icon ? (
        <div
          aria-hidden="true"
          style={{
            fontSize: 24,
            opacity: 0.4,
            marginBottom: 4,
            color: "var(--ink-3)",
          }}
        >
          {icon}
        </div>
      ) : null}
      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink-2)" }}>
        {title}
      </div>
      {hint ? (
        <div style={{ fontSize: 12, lineHeight: 1.5, maxWidth: 280 }}>
          {hint}
        </div>
      ) : null}
      {action ? <div style={{ marginTop: 12 }}>{action}</div> : null}
    </div>
  );
}
