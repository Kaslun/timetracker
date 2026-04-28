import { useMemo, useState } from "react";
import {
  aggregateByProject,
  avgFocusMinutes,
  bucketByDay,
  countFocusSessions,
  fmtPeriod,
} from "./selectors";
import {
  DASH_COLUMNS,
  PRESET_DEFAULT_COLS,
  type ColId,
  type Grouping,
  type PresetId,
} from "./presets";
import { Stat } from "./Stat";
import { WeeklyChart } from "./WeeklyChart";
import { ProjectBreakdown } from "./ProjectBreakdown";
import { EntriesTable } from "./EntriesTable";
import { ExportPanel } from "./ExportPanel";
import { startOfWeek, endOfWeek } from "@/lib/time";
import { EmptyState, Ic, TitleBar } from "@/components";
import { rpc } from "@/lib/api";
import { useStore } from "@/store";
import { useContainerWidth } from "@/lib/useContainerWidth";

const DAY_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
};
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatHoursLabel(h: number): string {
  return `${Math.floor(h)}h ${pad2(Math.round((h % 1) * 60))}m`;
}

export function DashboardRoot() {
  const entries = useStore((s) => s.entries);

  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string>("all");
  const [preset, setPreset] = useState<PresetId>("sheets");
  const [grouping, setGrouping] = useState<Grouping>("entry");
  const [cols, setCols] = useState<Record<ColId, boolean>>(() => {
    const init: Record<ColId, boolean> = {} as Record<ColId, boolean>;
    for (const c of DASH_COLUMNS) init[c.id] = true;
    return init;
  });

  const buckets = useMemo(
    () => bucketByDay(entries, anchor),
    [entries, anchor],
  );

  const projects = useMemo(() => {
    const inWeek = entries.filter(
      (e) =>
        e.startedAt >= startOfWeek(anchor).getTime() &&
        e.startedAt <= endOfWeek(anchor).getTime(),
    );
    const all = aggregateByProject(inWeek);
    if (all.length <= 4) return all;
    const top = all.slice(0, 3);
    const otherHours = all.slice(3).reduce((acc, p) => acc + p.hours, 0);
    return [
      ...top,
      {
        projectId: "__other__",
        projectName: "Other",
        projectColor: "var(--ink-3)",
        hours: otherHours,
      },
    ];
  }, [entries, anchor]);

  const weekTotalH = buckets.reduce((acc, b) => acc + b.hours, 0);
  const weekTotal = formatHoursLabel(weekTotalH);
  const period = fmtPeriod(anchor);

  const rowsAll = entries.filter(
    (e) =>
      e.startedAt >= startOfWeek(anchor).getTime() &&
      e.startedAt <= endOfWeek(anchor).getTime(),
  );
  const rows =
    selectedDay === "all"
      ? rowsAll
      : rowsAll.filter((e) => {
          const d = new Date(e.startedAt);
          d.setHours(0, 0, 0, 0);
          return DAY_LABELS[(d.getDay() + 6) % 7] === selectedDay;
        });

  const focusSessions = countFocusSessions(rowsAll);
  const avgMin = avgFocusMinutes(rowsAll);
  const topProject = projects[0];

  const stats = [
    {
      label: "Logged",
      value: weekTotal,
      sub: `${buckets.filter((b) => b.hours > 0).length} of 5 days`,
      tone: "pos" as const,
    },
    {
      label: "Unlogged gaps",
      value: "1h 46m",
      sub: "4 suggestions waiting",
      tone: "warn" as const,
    },
    {
      label: "Focus sessions",
      value: String(focusSessions),
      sub: `avg ${avgMin} min`,
      tone: "pos" as const,
    },
    {
      label: "Top project",
      value: topProject ? topProject.projectName.slice(0, 12) : "—",
      sub: topProject
        ? `${topProject.hours.toFixed(1)}h · ${Math.round((topProject.hours / Math.max(0.01, weekTotalH)) * 100)}%`
        : "",
    },
  ];

  const toggleCol = (id: ColId): void => {
    const c = DASH_COLUMNS.find((x) => x.id === id);
    if (!c || c.req) return;
    setCols((s) => ({ ...s, [id]: !s[id] }));
  };

  const onPickPreset = (p: PresetId): void => {
    setPreset(p);
    const enabled = new Set(PRESET_DEFAULT_COLS[p]);
    const next: Record<ColId, boolean> = {} as Record<ColId, boolean>;
    for (const c of DASH_COLUMNS) {
      next[c.id] = c.req || enabled.has(c.id);
    }
    setCols(next);
  };

  const onDownload = (): void => {
    const activeCols = (Object.keys(cols) as ColId[]).filter((c) => cols[c]);
    const range = selectedDay === "all" ? "week" : "custom";
    let from: number | undefined;
    let to: number | undefined;
    if (selectedDay !== "all") {
      const start = startOfWeek(anchor);
      start.setDate(start.getDate() + (DAY_INDEX[selectedDay] ?? 0));
      from = start.getTime();
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      to = end.getTime();
    }
    void rpc("export:csv", {
      range,
      from,
      to,
      columns: activeCols,
      grouping,
      preset,
    });
  };

  const { ref, breakpoint } = useContainerWidth<HTMLDivElement>();
  // Round 4: dashboard layout responds to its own width via ResizeObserver.
  // - Compact (<520px): stat cards + breakdown panes stack to one column.
  // - Default (520-820px): existing 4-up stat row, 1.4fr/1fr split.
  // - Wide (>820px): keep the wide split (and let cards breathe via the
  //   shared `.bp-wide` rule in tokens.css).
  const statsCols =
    breakpoint === "compact"
      ? "repeat(2, 1fr)"
      : breakpoint === "wide"
        ? "repeat(4, 1fr)"
        : "repeat(4, 1fr)";
  const splitCols =
    breakpoint === "compact" ? "1fr" : "1.4fr 1fr";

  return (
    <div
      ref={ref}
      className={`attensi window bp-${breakpoint}`}
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      <TitleBar
        title="Attensi · Dashboard"
        onClose={() => void rpc("window:close")}
      />
      <div
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div
            className="display"
            style={{
              fontSize: 11,
              color: "var(--ink-3)",
              fontWeight: 500,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {period.label}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <div
              className="display num"
              style={{
                fontSize: 26,
                fontWeight: 500,
                letterSpacing: "-0.015em",
                lineHeight: 1,
              }}
            >
              {weekTotal}
            </div>
          </div>
        </div>
        <span style={{ flex: 1 }} />
        <button
          className="btn icon"
          title="Previous"
          onClick={() =>
            setAnchor((a) => new Date(a.getTime() - 7 * 24 * 60 * 60 * 1000))
          }
        >
          <Ic.Chevron s={11} dir="left" />
        </button>
        <button className="btn" onClick={() => setAnchor(new Date())}>
          This week
        </button>
        <button
          className="btn icon"
          title="Next"
          onClick={() =>
            setAnchor((a) => new Date(a.getTime() + 7 * 24 * 60 * 60 * 1000))
          }
        >
          <Ic.Chevron s={11} dir="right" />
        </button>
      </div>

      <div
        className="scroll"
        style={{
          flex: 1,
          padding: "20px 24px",
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          background: "var(--bg-2)",
        }}
      >
        {entries.length === 0 ? (
          <EmptyState
            title="No data yet"
            hint="Connect an integration in Settings, or log a task to start filling out your dashboard."
            action={
              <button
                className="btn"
                onClick={() => void rpc("window:openSettings")}
              >
                Open Settings
              </button>
            }
          />
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: statsCols,
                gap: 16,
              }}
            >
              {stats.map((s) => (
                <Stat key={s.label} {...s} />
              ))}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: splitCols,
                gap: 16,
              }}
            >
              <WeeklyChart
                buckets={buckets}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
              />
              <ProjectBreakdown projects={projects} />
            </div>
            <EntriesTable
              rows={rows}
              cols={cols}
              selectedDay={selectedDay}
              anchor={anchor}
            />
            <ExportPanel
              rowsCount={rows.length}
              cols={cols}
              preset={preset}
              grouping={grouping}
              onToggleCol={toggleCol}
              onPickPreset={onPickPreset}
              onChangeGrouping={setGrouping}
              onDownload={onDownload}
            />
          </>
        )}
      </div>
    </div>
  );
}
