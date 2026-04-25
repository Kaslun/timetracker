import { useStore } from "@/store";
import { startOfDay } from "@/lib/time";
import { rpc } from "@/lib/api";
import type { EntryRow } from "@shared/types";
import { Ic } from "@/components";

const HOUR_PX = 42;
const DAY_START_HOUR = 8;
const DAY_END_HOUR = 19;

function fmtHM(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.round((secs % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

interface Block {
  kind: "entry" | "gap";
  topPx: number;
  heightPx: number;
  entry?: EntryRow;
  gapStartedAt?: number;
  gapEndedAt?: number;
  gapMinutes?: number;
}

function buildBlocks(
  entries: EntryRow[],
  dayStart: number,
  now: number,
): Block[] {
  const dayBlocks = entries
    .filter(
      (e) =>
        e.startedAt >= dayStart && e.startedAt < dayStart + 24 * 60 * 60 * 1000,
    )
    .sort((a, b) => a.startedAt - b.startedAt);

  const blocks: Block[] = [];
  const startMs = dayStart + DAY_START_HOUR * 60 * 60 * 1000;
  let cursor = startMs;
  for (const e of dayBlocks) {
    const eStart = Math.max(e.startedAt, startMs);
    const eEnd = Math.min(
      e.endedAt ?? now,
      dayStart + DAY_END_HOUR * 60 * 60 * 1000,
    );
    if (eEnd <= cursor) continue;
    if (eStart > cursor) {
      const gapMs = eStart - cursor;
      const gapMinutes = Math.round(gapMs / 60_000);
      if (gapMinutes >= 5) {
        blocks.push({
          kind: "gap",
          topPx: ((cursor - dayStart) / 3_600_000 - DAY_START_HOUR) * HOUR_PX,
          heightPx: (gapMs / 3_600_000) * HOUR_PX - 2,
          gapStartedAt: cursor,
          gapEndedAt: eStart,
          gapMinutes,
        });
      }
    }
    blocks.push({
      kind: "entry",
      topPx: ((eStart - dayStart) / 3_600_000 - DAY_START_HOUR) * HOUR_PX,
      heightPx: ((eEnd - eStart) / 3_600_000) * HOUR_PX - 2,
      entry: e,
    });
    cursor = eEnd;
  }
  return blocks.filter((b) => b.heightPx > 6);
}

function paletteFor(e: EntryRow): { bg: string; bd: string } {
  switch (e.tag) {
    case "meet":
      return {
        bg: "color-mix(in oklab, var(--ink) 6%, var(--surface))",
        bd: "var(--line-2)",
      };
    case "dev":
      return { bg: "var(--accent-2)", bd: "var(--accent)" };
    case "ops":
      return { bg: "var(--surface-2)", bd: "var(--line-2)" };
    case "break":
      return {
        bg: "color-mix(in oklab, #6a9d88 12%, var(--surface))",
        bd: "#6a9d88",
      };
    default: {
      // Use the project color as the strip
      return { bg: "var(--surface-2)", bd: e.projectColor };
    }
  }
}

export function TimelineTab() {
  const entries = useStore((s) => s.entries);
  const tick = useStore((s) => s.tick);
  const dayStart = startOfDay(new Date(tick)).getTime();
  const blocks = buildBlocks(entries, dayStart, tick);

  const totalLogged = entries
    .filter((e) => e.startedAt >= dayStart)
    .reduce((acc, e) => acc + ((e.endedAt ?? tick) - e.startedAt) / 1000, 0);
  const totalLoose = blocks
    .filter((b) => b.kind === "gap")
    .reduce((a, b) => a + (b.gapMinutes ?? 0) * 60, 0);

  const hours: number[] = [];
  for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h++) hours.push(h);
  const nowH = (tick - dayStart) / 3_600_000;

  const onClickGap = async (block: Block): Promise<void> => {
    if (block.kind !== "gap") return;
    await rpc("window:setExpandedTab", { tab: "fill" });
  };

  return (
    <div
      className="scroll"
      style={{ flex: 1, padding: "14px 16px", overflow: "auto" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <span className="display" style={{ fontSize: 18, fontWeight: 500 }}>
          Your day
        </span>
        <span className="mono num ink-3" style={{ fontSize: 11 }}>
          {fmtHM(totalLogged)} logged ·{" "}
          <span style={{ color: "var(--accent)" }}>
            {fmtHM(totalLoose)} loose
          </span>
        </span>
      </div>
      <div
        style={{
          position: "relative",
          display: "flex",
          minHeight: hours.length * HOUR_PX,
        }}
      >
        <div style={{ width: 40, display: "flex", flexDirection: "column" }}>
          {hours.map((h) => (
            <div
              key={h}
              className="mono"
              style={{
                height: HOUR_PX,
                fontSize: 10,
                color: "var(--ink-3)",
                paddingTop: 1,
              }}
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>
        <div
          style={{
            flex: 1,
            position: "relative",
            marginLeft: 4,
            borderLeft: "1px solid var(--line)",
          }}
        >
          {hours.map((h, i) => (
            <div
              key={h}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: i * HOUR_PX,
                borderTop: i === 0 ? "none" : "1px dashed var(--line)",
              }}
            />
          ))}

          {blocks.map((b, i) => {
            if (b.kind === "gap") {
              return (
                <button
                  key={`gap-${i}`}
                  onClick={() => void onClickGap(b)}
                  style={{
                    position: "absolute",
                    left: 6,
                    right: 6,
                    top: b.topPx,
                    height: b.heightPx,
                    border: "1px dashed var(--accent)",
                    borderRadius: 6,
                    color: "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                      "color-mix(in oklab, var(--accent) 6%, transparent)",
                    cursor: "pointer",
                    fontSize: 10,
                    fontWeight: 500,
                  }}
                  title={`Fill ${b.gapMinutes}m`}
                >
                  <Ic.Plus s={10} />
                  <span style={{ marginLeft: 4 }}>
                    Fill this gap · {b.gapMinutes}m
                  </span>
                </button>
              );
            }
            const e = b.entry;
            if (!e) return null;
            const palette = paletteFor(e);
            const lenH = ((e.endedAt ?? tick) - e.startedAt) / 3_600_000;
            const isActive = !e.endedAt;
            return (
              <div
                key={`e-${e.id}`}
                style={{
                  position: "absolute",
                  left: 6,
                  right: 6,
                  top: b.topPx,
                  height: b.heightPx,
                  background: palette.bg,
                  borderLeft: `3px solid ${palette.bd}`,
                  borderRadius: 6,
                  padding: "4px 8px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: b.heightPx < 30 ? "center" : "flex-start",
                  gap: 2,
                  boxShadow: isActive ? "0 0 0 2px var(--accent)" : "none",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {e.taskTitle}
                </span>
                {b.heightPx > 36 && (
                  <span className="mono num ink-3" style={{ fontSize: 9 }}>
                    {Math.floor(lenH)}h{" "}
                    {String(Math.round((lenH % 1) * 60)).padStart(2, "0")}m
                  </span>
                )}
              </div>
            );
          })}

          {/* NOW indicator */}
          {nowH >= DAY_START_HOUR && nowH <= DAY_END_HOUR && (
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: (nowH - DAY_START_HOUR) * HOUR_PX,
                borderTop: "2px solid var(--accent)",
                zIndex: 3,
              }}
            >
              <span
                className="mono"
                style={{
                  position: "absolute",
                  left: -36,
                  top: -8,
                  fontSize: 9,
                  color: "var(--accent)",
                  fontWeight: 600,
                  background: "var(--surface)",
                  padding: "0 3px",
                }}
              >
                NOW
              </span>
              <span
                style={{
                  position: "absolute",
                  left: -5,
                  top: -5,
                  width: 9,
                  height: 9,
                  background: "var(--accent)",
                  borderRadius: "50%",
                  border: "2px solid var(--surface)",
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
