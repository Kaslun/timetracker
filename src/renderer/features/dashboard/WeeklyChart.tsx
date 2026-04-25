import type { DayBucket } from "./selectors";

const BAR_COLORS = [
  "var(--accent)",
  "color-mix(in oklab, var(--accent) 55%, transparent)",
  "var(--ink-3)",
  "var(--ink-4)",
];

export interface WeeklyChartProps {
  buckets: DayBucket[];
  selectedDay: string;
  onSelectDay: (day: string) => void;
}

export function WeeklyChart({
  buckets,
  selectedDay,
  onSelectDay,
}: WeeklyChartProps) {
  const maxHrs = Math.max(8.5, ...buckets.map((b) => b.hours));

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
          marginBottom: 14,
        }}
      >
        <div
          className="display"
          style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.005em" }}
        >
          Hours by day
        </div>
        <span style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 3 }}>
          <button className="btn">W</button>
          <button className="btn ghost">M</button>
          <button className="btn ghost">Q</button>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 10,
          height: 160,
        }}
      >
        {buckets.map((d) => {
          const h = Math.max((d.hours / maxHrs) * 140, 2);
          const isSel = selectedDay === d.day;
          const dim = selectedDay !== "all" && !isSel;
          return (
            <button
              key={d.day}
              onClick={() => onSelectDay(isSel ? "all" : d.day)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 5,
                cursor: "pointer",
                opacity: dim ? 0.35 : 1,
                transition: "opacity 0.15s",
                background: "transparent",
                border: 0,
                padding: 0,
              }}
            >
              <div
                className="mono num"
                style={{
                  fontSize: 10,
                  color: d.isToday || isSel ? "var(--accent)" : "var(--ink-3)",
                  fontWeight: 600,
                }}
              >
                {d.hours > 0 ? `${d.hours.toFixed(1)}h` : "—"}
              </div>
              <div
                style={{
                  width: "100%",
                  height: 140,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                }}
              >
                {d.hours > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      height: h,
                      width: "100%",
                      borderRadius: "3px 3px 0 0",
                      overflow: "hidden",
                      border: isSel
                        ? "1.5px solid var(--accent)"
                        : "1px solid var(--line)",
                      borderBottom: "none",
                    }}
                  >
                    {d.perProject.map((p, ti) => {
                      const frac = p.hours / d.hours;
                      return (
                        <div
                          key={p.projectId}
                          style={{
                            height: `${frac * 100}%`,
                            background: BAR_COLORS[ti] ?? "var(--ink-4)",
                            borderTop:
                              ti > 0
                                ? "1px solid rgba(255,255,255,0.15)"
                                : "none",
                          }}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div
                    style={{
                      height: 28,
                      border: "1px dashed var(--line-2)",
                      borderRadius: "3px 3px 0 0",
                      background: "var(--bg-2)",
                    }}
                  />
                )}
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: d.isToday ? "var(--accent)" : "var(--ink-2)",
                  letterSpacing: "0.02em",
                }}
              >
                {d.day}
              </div>
            </button>
          );
        })}
      </div>
      <div
        className="mono ink-3"
        style={{ fontSize: 10, textAlign: "center", marginTop: 10 }}
      >
        {selectedDay === "all" ? (
          "Tap a day to scope the table + export below"
        ) : (
          <>
            Filtered to{" "}
            <span style={{ color: "var(--accent)" }}>{selectedDay}</span> ·{" "}
            <button
              onClick={() => onSelectDay("all")}
              style={{
                textDecoration: "underline",
                cursor: "pointer",
                color: "inherit",
              }}
            >
              show all
            </button>
          </>
        )}
      </div>
    </div>
  );
}
