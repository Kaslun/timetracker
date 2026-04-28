import type { CSSProperties } from "react";
import type { EntryRow } from "@shared/types";
import { DASH_COLUMNS, type ColId } from "./presets";
import { isoDate } from "@/lib/time";
import { TimeDisplay } from "@/components";

const cellStyle: CSSProperties = {
  padding: "6px 12px",
  color: "var(--ink-2)",
  whiteSpace: "nowrap",
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function clockOf(ts: number): string {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export interface EntriesTableProps {
  rows: EntryRow[];
  cols: Record<ColId, boolean>;
  selectedDay: string;
  anchor: Date;
}

export function EntriesTable({
  rows,
  cols,
  selectedDay,
  anchor,
}: EntriesTableProps) {
  const activeColIds = (Object.keys(cols) as ColId[]).filter((c) => cols[c]);
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <div
        style={{
          padding: "11px 16px",
          borderBottom: "1px solid var(--line)",
          background: "var(--surface-2)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div className="display" style={{ fontSize: 13, fontWeight: 600 }}>
          Entries{" "}
          {selectedDay !== "all" && (
            <span
              className="mono ink-3"
              style={{ fontWeight: 400, fontSize: 11, marginLeft: 6 }}
            >
              · {selectedDay}
            </span>
          )}
        </div>
        <span className="mono ink-3" style={{ fontSize: 10 }}>
          {rows.length} rows
        </span>
        <span style={{ flex: 1 }} />
        <span className="mono ink-3" style={{ fontSize: 10 }}>
          {activeColIds.length}/{DASH_COLUMNS.length} cols ·
        </span>
        <span className="mono" style={{ fontSize: 10, color: "var(--ink-2)" }}>
          attensi-week-{isoDate(anchor)}.csv
        </span>
      </div>
      <div style={{ overflow: "auto", flex: 1, maxHeight: 260 }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
          }}
        >
          <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
            <tr style={{ background: "var(--bg-2)" }}>
              {DASH_COLUMNS.filter((c) => cols[c.id]).map((c) => (
                <th
                  key={c.id}
                  style={{
                    padding: "7px 12px",
                    textAlign: "left",
                    borderBottom: "1px solid var(--line-2)",
                    color: "var(--ink-2)",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    letterSpacing: 0,
                  }}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const running = r.endedAt == null;
              const dur = ((r.endedAt ?? Date.now()) - r.startedAt) / 3_600_000;
              return (
                <tr
                  key={r.id}
                  style={{
                    borderBottom: "1px solid var(--line)",
                    background: running
                      ? "color-mix(in oklab, var(--accent) 6%, transparent)"
                      : "transparent",
                  }}
                >
                  {cols.date && (
                    <td style={cellStyle}>{isoDate(new Date(r.startedAt))}</td>
                  )}
                  {cols.start && (
                    <td style={cellStyle}>
                      <TimeDisplay value={clockOf(r.startedAt)} />
                    </td>
                  )}
                  {cols.end && (
                    <td style={cellStyle}>
                      {running ? (
                        <span
                          style={{ color: "var(--accent)", fontWeight: 600 }}
                        >
                          ● running
                        </span>
                      ) : r.endedAt != null ? (
                        <TimeDisplay value={clockOf(r.endedAt)} />
                      ) : (
                        "—"
                      )}
                    </td>
                  )}
                  {cols.duration && (
                    <td
                      style={{
                        ...cellStyle,
                        fontWeight: 600,
                        color: "var(--ink)",
                      }}
                    >
                      {dur.toFixed(2)}
                    </td>
                  )}
                  {cols.project && <td style={cellStyle}>{r.projectName}</td>}
                  {cols.ticket && (
                    <td style={cellStyle}>
                      {r.ticket ?? <span className="ink-3">—</span>}
                    </td>
                  )}
                  {cols.task && (
                    <td
                      style={{
                        ...cellStyle,
                        maxWidth: 220,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {r.taskTitle}
                    </td>
                  )}
                  {cols.tag && (
                    <td style={cellStyle}>
                      {r.tag ? (
                        <span
                          style={{
                            padding: "1px 6px",
                            borderRadius: 3,
                            background: "var(--bg-2)",
                            fontSize: 9,
                            color: "var(--ink-2)",
                          }}
                        >
                          {r.tag}
                        </span>
                      ) : null}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
