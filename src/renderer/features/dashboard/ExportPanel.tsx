import type { CSSProperties } from "react";
import {
  DASH_COLUMNS,
  DASH_PRESETS,
  GROUPING_OPTIONS,
  type ColId,
  type Grouping,
  type PresetId,
} from "./presets";
import { Ic } from "@/components";

const labelStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: "var(--ink-3)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: 7,
};

export interface ExportPanelProps {
  rowsCount: number;
  cols: Record<ColId, boolean>;
  preset: PresetId;
  grouping: Grouping;
  onToggleCol: (id: ColId) => void;
  onPickPreset: (p: PresetId) => void;
  onChangeGrouping: (g: Grouping) => void;
  onDownload: () => void;
}

export function ExportPanel({
  rowsCount,
  cols,
  preset,
  grouping,
  onToggleCol,
  onPickPreset,
  onChangeGrouping,
  onDownload,
}: ExportPanelProps) {
  const activeColIds = (Object.keys(cols) as ColId[]).filter((c) => cols[c]);

  return (
    <div
      style={{
        padding: "14px 18px",
        background: "var(--surface-2)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div className="display" style={{ fontSize: 13, fontWeight: 600 }}>
          Export
        </div>
        <span className="mono ink-3" style={{ fontSize: 10 }}>
          {rowsCount} rows · {activeColIds.length} cols ·{" "}
          {grouping === "entry"
            ? "per entry"
            : grouping === "task"
              ? "per task/day"
              : "per project/day"}
        </span>
        <span style={{ flex: 1 }} />
        <button
          className="btn"
          style={{
            fontSize: 10,
            padding: "4px 10px",
            display: "flex",
            gap: 5,
            alignItems: "center",
          }}
          title="Email copy (todo)"
          disabled
        >
          <Ic.Calendar s={10} /> Schedule
        </button>
        <button
          className="btn accent"
          onClick={onDownload}
          style={{
            fontSize: 11,
            padding: "6px 14px",
            display: "flex",
            gap: 6,
            alignItems: "center",
            fontWeight: 600,
          }}
        >
          <Ic.Download s={11} /> Download CSV
        </button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 14,
          alignItems: "start",
        }}
      >
        <div>
          <div className="display ink-3" style={labelStyle}>
            Preset
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}
          >
            {DASH_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => onPickPreset(p.id)}
                style={{
                  padding: "5px 8px",
                  borderRadius: "var(--radius-sm)",
                  border: `1px solid ${preset === p.id ? "var(--accent)" : "var(--line)"}`,
                  background:
                    preset === p.id
                      ? "color-mix(in oklab, var(--accent) 10%, var(--surface))"
                      : "var(--surface)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 500 }}>{p.label}</div>
                <div
                  className="mono ink-3"
                  style={{ fontSize: 9, marginTop: 1 }}
                >
                  {p.hint}
                </div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="display ink-3" style={labelStyle}>
            Columns
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {DASH_COLUMNS.map((c) => {
              const on = cols[c.id];
              return (
                <button
                  key={c.id}
                  onClick={() => onToggleCol(c.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "3px 8px",
                    borderRadius: 999,
                    border: `1px solid ${on ? "var(--accent)" : "var(--line-2)"}`,
                    background: on
                      ? "color-mix(in oklab, var(--accent) 10%, var(--surface))"
                      : "var(--surface)",
                    color: on ? "var(--accent-ink)" : "var(--ink-3)",
                    cursor: c.req ? "default" : "pointer",
                    fontSize: 10,
                    fontWeight: 500,
                    opacity: c.req && !on ? 0.4 : 1,
                  }}
                >
                  {on && <Ic.Check s={8} />}
                  <span>{c.label}</span>
                  {c.req && (
                    <span
                      className="mono"
                      style={{ fontSize: 8, opacity: 0.6 }}
                    >
                      req
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <div className="display ink-3" style={labelStyle}>
            Group rows
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {GROUPING_OPTIONS.map((g) => (
              <button
                key={g.id}
                onClick={() => onChangeGrouping(g.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                  padding: "2px 0",
                  background: "transparent",
                  border: 0,
                  textAlign: "left",
                  cursor: "pointer",
                  color: "inherit",
                }}
              >
                <span
                  style={{
                    width: 11,
                    height: 11,
                    borderRadius: "50%",
                    border: `1.5px solid ${grouping === g.id ? "var(--accent)" : "var(--ink-4)"}`,
                    background:
                      grouping === g.id ? "var(--accent)" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {grouping === g.id && (
                    <span
                      style={{
                        width: 3,
                        height: 3,
                        borderRadius: "50%",
                        background: "#fff",
                      }}
                    />
                  )}
                </span>
                <span
                  style={{
                    color: grouping === g.id ? "var(--ink)" : "var(--ink-2)",
                  }}
                >
                  {g.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
