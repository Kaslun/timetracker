import type { ProjectAgg } from "./selectors";

const BAR_COLORS = [
  "var(--accent)",
  "color-mix(in oklab, var(--accent) 55%, transparent)",
  "var(--ink-3)",
  "var(--ink-4)",
];

export interface ProjectBreakdownProps {
  projects: ProjectAgg[];
}

export function ProjectBreakdown({ projects }: ProjectBreakdownProps) {
  const total = projects.reduce((acc, p) => acc + p.hours, 0);

  return (
    <div
      style={{
        padding: "14px 18px",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div className="display" style={{ fontSize: 13, fontWeight: 600 }}>
          By project
        </div>
        <span style={{ flex: 1 }} />
        <span className="mono ink-3" style={{ fontSize: 10 }}>
          {total.toFixed(1)}h total
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {projects.map((p, i) => {
          const color = BAR_COLORS[i] ?? p.projectColor;
          const pct = total > 0 ? p.hours / total : 0;
          return (
            <div key={p.projectId}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                  marginBottom: 3,
                }}
              >
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 2,
                    background: color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.projectName}
                </span>
                <span
                  className="mono num"
                  style={{ fontSize: 11, color: "var(--ink-2)" }}
                >
                  {p.hours.toFixed(1)}h
                </span>
                <span
                  className="mono ink-3"
                  style={{ fontSize: 10, width: 32, textAlign: "right" }}
                >
                  {Math.round(pct * 100)}%
                </span>
              </div>
              <div
                style={{
                  height: 4,
                  borderRadius: 2,
                  background: "var(--bg-2)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${pct * 100}%`,
                    height: "100%",
                    background: color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
