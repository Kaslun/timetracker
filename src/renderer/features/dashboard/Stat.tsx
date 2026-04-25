import type { CSSProperties } from "react";

export interface StatProps {
  label: string;
  value: string;
  sub?: string;
  tone?: "pos" | "warn" | "neutral";
}

const wrapperStyle: CSSProperties = {
  padding: "11px 13px",
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius)",
  minWidth: 0,
};

export function Stat({ label, value, sub, tone = "neutral" }: StatProps) {
  const toneColor =
    tone === "pos"
      ? "var(--accent)"
      : tone === "warn"
        ? "var(--warn)"
        : "var(--ink-3)";
  return (
    <div style={wrapperStyle}>
      <div
        className="display ink-3"
        style={{
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        className="display num"
        style={{
          fontSize: 20,
          fontWeight: 500,
          letterSpacing: "-0.015em",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          className="mono"
          style={{ fontSize: 10, marginTop: 4, color: toneColor }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
