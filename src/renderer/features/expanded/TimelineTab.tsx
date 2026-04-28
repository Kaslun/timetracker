import { useEffect, useRef, useState } from "react";
import type { EntryRow } from "@shared/types";
import { useStore } from "@/store";
import { startOfDay } from "@/lib/time";
import { rpc } from "@/lib/api";
import { TimeDisplay } from "@/components";

const HOUR_PX = 42;
const DAY_START_HOUR = 8;
const DAY_END_HOUR = 19;
const SNAP_MIN = 5;
const SNAP_MS = SNAP_MIN * 60_000;
const PX_PER_MS = HOUR_PX / 3_600_000;
const MIN_DURATION_MS = SNAP_MS;

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

interface BlockTarget {
  startedAt: number;
  endedAt: number;
  topPx: number;
  heightPx: number;
}

interface DragState {
  entryId: string;
  mode: "move" | "resize-start" | "resize-end";
  startY: number;
  origStartedAt: number;
  origEndedAt: number;
  draftStartedAt: number;
  draftEndedAt: number;
}

/** Active drag-to-create on empty timeline space. */
interface CreateDragState {
  anchorMs: number;
  startedAt: number;
  endedAt: number;
}

function snap(ms: number): number {
  return Math.round(ms / SNAP_MS) * SNAP_MS;
}

function clockTimeShort(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

export function TimelineTab() {
  const entries = useStore((s) => s.entries);
  const tasks = useStore((s) => s.tasks);
  const tick = useStore((s) => s.tick);
  const dayStart = startOfDay(new Date(tick)).getTime();
  const blocks = buildBlocks(entries, dayStart, tick);

  const [createTarget, setCreateTarget] = useState<BlockTarget | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [createDrag, setCreateDrag] = useState<CreateDragState | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const liveEntries: EntryRow[] = drag
    ? entries.map((e) =>
        e.id === drag.entryId
          ? { ...e, startedAt: drag.draftStartedAt, endedAt: drag.draftEndedAt }
          : e,
      )
    : entries;
  const liveBlocks = drag ? buildBlocks(liveEntries, dayStart, tick) : blocks;

  const totalLogged = liveEntries
    .filter((e) => e.startedAt >= dayStart)
    .reduce((acc, e) => acc + ((e.endedAt ?? tick) - e.startedAt) / 1000, 0);
  const totalLoose = liveBlocks
    .filter((b) => b.kind === "gap")
    .reduce((a, b) => a + (b.gapMinutes ?? 0) * 60, 0);

  const hours: number[] = [];
  for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h++) hours.push(h);
  const nowH = (tick - dayStart) / 3_600_000;

  /** Convert a Y coordinate within the track to a snapped wall-clock ms. */
  const yToMs = (y: number): number => {
    const baseMs = dayStart + DAY_START_HOUR * 3_600_000;
    return snap(baseMs + y / PX_PER_MS);
  };

  const onTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    // Only handle the empty-track case — entry blocks stop propagation in
    // their own pointerDown handler.
    if (e.target !== e.currentTarget) return;
    if (e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const anchorMs = yToMs(y);
    e.currentTarget.setPointerCapture(e.pointerId);
    setCreateDrag({
      anchorMs,
      startedAt: anchorMs,
      endedAt: anchorMs + MIN_DURATION_MS,
    });
  };

  useEffect(() => {
    if (!createDrag) return;
    const track = trackRef.current;
    if (!track) return;
    // Inlined yToMs to satisfy `react-hooks/exhaustive-deps` without adding
    // an unstable function reference to the dependency array.
    const localYToMs = (y: number): number => {
      const baseMs = dayStart + DAY_START_HOUR * 3_600_000;
      return snap(baseMs + y / PX_PER_MS);
    };
    const onMove = (ev: PointerEvent): void => {
      const rect = track.getBoundingClientRect();
      const y = ev.clientY - rect.top;
      const cursorMs = localYToMs(y);
      const startedAt = Math.min(createDrag.anchorMs, cursorMs);
      const endedAt = Math.max(
        createDrag.anchorMs + MIN_DURATION_MS,
        cursorMs,
        startedAt + MIN_DURATION_MS,
      );
      setCreateDrag({ ...createDrag, startedAt, endedAt });
    };
    const onUp = (): void => {
      const ds = createDrag;
      setCreateDrag(null);
      if (!ds) return;
      if (ds.endedAt - ds.startedAt < MIN_DURATION_MS) return;
      const topPx =
        ((ds.startedAt - dayStart) / 3_600_000 - DAY_START_HOUR) * HOUR_PX;
      const heightPx = ((ds.endedAt - ds.startedAt) / 3_600_000) * HOUR_PX;
      setCreateTarget({
        startedAt: ds.startedAt,
        endedAt: ds.endedAt,
        topPx,
        heightPx,
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [createDrag, dayStart]);

  const onSubmitCreate = async (taskId: string): Promise<void> => {
    if (!createTarget) return;
    await rpc("entry:insert", {
      taskId,
      startedAt: createTarget.startedAt,
      endedAt: createTarget.endedAt,
      source: "manual",
    });
    setCreateTarget(null);
  };

  const onPointerDownEntry = (
    e: React.PointerEvent<HTMLDivElement>,
    entry: EntryRow,
    mode: DragState["mode"],
  ): void => {
    if (!entry.endedAt) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({
      entryId: entry.id,
      mode,
      startY: e.clientY,
      origStartedAt: entry.startedAt,
      origEndedAt: entry.endedAt,
      draftStartedAt: entry.startedAt,
      draftEndedAt: entry.endedAt,
    });
  };

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent): void => {
      const dy = e.clientY - drag.startY;
      const dms = snap(dy / PX_PER_MS);
      let s = drag.origStartedAt;
      let n = drag.origEndedAt;
      if (drag.mode === "move") {
        s = drag.origStartedAt + dms;
        n = drag.origEndedAt + dms;
      } else if (drag.mode === "resize-start") {
        s = Math.min(
          drag.origStartedAt + dms,
          drag.origEndedAt - MIN_DURATION_MS,
        );
      } else {
        n = Math.max(
          drag.origEndedAt + dms,
          drag.origStartedAt + MIN_DURATION_MS,
        );
      }
      setDrag({ ...drag, draftStartedAt: s, draftEndedAt: n });
    };
    const onUp = async (): Promise<void> => {
      const ds = drag;
      setDrag(null);
      const changed =
        ds.draftStartedAt !== ds.origStartedAt ||
        ds.draftEndedAt !== ds.origEndedAt;
      if (changed) {
        await rpc("entry:update", {
          id: ds.entryId,
          patch: {
            startedAt: ds.draftStartedAt,
            endedAt: ds.draftEndedAt,
          },
        });
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag]);

  return (
    <div
      className="scroll"
      style={{ flex: 1, padding: "16px 18px", overflow: "auto" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 12,
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
          ref={trackRef}
          onPointerDown={onTrackPointerDown}
          style={{
            flex: 1,
            position: "relative",
            marginLeft: 4,
            borderLeft: "1px solid var(--line)",
            cursor: createDrag ? "ns-resize" : "crosshair",
            touchAction: "none",
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
                pointerEvents: "none",
              }}
            />
          ))}

          {liveBlocks.map((b) => {
            // Gap rendering removed — drag-to-create on empty space
            // replaces the dedicated "Fill this gap" buttons.
            if (b.kind === "gap") return null;
            const e = b.entry;
            if (!e) return null;
            const palette = paletteFor(e);
            const lenH = ((e.endedAt ?? tick) - e.startedAt) / 3_600_000;
            const isActive = !e.endedAt;
            const isDragging = drag?.entryId === e.id;
            return (
              <div
                key={`e-${e.id}`}
                onPointerDown={(ev) => onPointerDownEntry(ev, e, "move")}
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
                  boxShadow: isDragging
                    ? "0 0 0 2px var(--accent), var(--shadow-md)"
                    : isActive
                      ? "0 0 0 2px var(--accent)"
                      : "none",
                  cursor: isActive ? "default" : "grab",
                  userSelect: "none",
                  touchAction: "none",
                  opacity: isDragging ? 0.92 : 1,
                }}
              >
                {!isActive && (
                  <div
                    onPointerDown={(ev) =>
                      onPointerDownEntry(ev, e, "resize-start")
                    }
                    title="Drag to set start time"
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: -3,
                      height: 6,
                      cursor: "ns-resize",
                    }}
                  />
                )}
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
                    {isDragging ? (
                      <>
                        {" · "}
                        <TimeDisplay
                          as="span"
                          value={clockTimeShort(e.startedAt)}
                        />
                        {" – "}
                        <TimeDisplay
                          as="span"
                          value={clockTimeShort(e.endedAt ?? tick)}
                        />
                      </>
                    ) : null}
                  </span>
                )}
                {!isActive && (
                  <div
                    onPointerDown={(ev) =>
                      onPointerDownEntry(ev, e, "resize-end")
                    }
                    title="Drag to set end time"
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: -3,
                      height: 6,
                      cursor: "ns-resize",
                    }}
                  />
                )}
              </div>
            );
          })}

          {createDrag ? (
            <div
              style={{
                position: "absolute",
                left: 6,
                right: 6,
                top:
                  ((createDrag.startedAt - dayStart) / 3_600_000 -
                    DAY_START_HOUR) *
                  HOUR_PX,
                height:
                  ((createDrag.endedAt - createDrag.startedAt) / 3_600_000) *
                  HOUR_PX,
                border: "1.5px dashed var(--accent)",
                borderRadius: 6,
                background:
                  "color-mix(in oklab, var(--accent) 8%, transparent)",
                color: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 600,
                pointerEvents: "none",
              }}
            >
              <TimeDisplay
                as="span"
                value={clockTimeShort(createDrag.startedAt)}
              />{" "}
              –{" "}
              <TimeDisplay
                as="span"
                value={clockTimeShort(createDrag.endedAt)}
              />
            </div>
          ) : null}

          {createTarget ? (
            <BlockCreatePopover
              block={createTarget}
              tasks={tasks}
              onCancel={() => setCreateTarget(null)}
              onSubmit={onSubmitCreate}
            />
          ) : null}

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
                className="now-dot"
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

interface BlockCreatePopoverProps {
  block: BlockTarget;
  tasks: ReturnType<typeof useStore.getState>["tasks"];
  onCancel: () => void;
  onSubmit: (taskId: string) => Promise<void>;
}

/**
 * Inline picker shown after a drag-to-create on the timeline. Lets the user
 * assign the new block to an existing task (creating a brand-new task is
 * still done from the Tasks tab — keeps this surface small).
 */
function BlockCreatePopover({
  block,
  tasks,
  onCancel,
  onSubmit,
}: BlockCreatePopoverProps) {
  const openTasks = tasks.filter((t) => !t.completedAt);
  const [taskId, setTaskId] = useState<string>(openTasks[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent): void => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onCancel();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onCancel]);

  const minutes = Math.round((block.endedAt - block.startedAt) / 60_000);

  const submit = async (): Promise<void> => {
    if (!taskId) return;
    setBusy(true);
    try {
      await onSubmit(taskId);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      ref={ref}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        top: block.topPx + Math.min(block.heightPx + 4, 4),
        zIndex: 4,
        background: "var(--surface)",
        border: "1px solid var(--line-2)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow-md)",
        padding: 10,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600 }}>New block</span>
        <span className="mono ink-3" style={{ fontSize: 10 }}>
          <TimeDisplay as="span" value={clockTimeShort(block.startedAt)} /> –{" "}
          <TimeDisplay as="span" value={clockTimeShort(block.endedAt)} /> ·{" "}
          {minutes}m
        </span>
      </div>
      {openTasks.length === 0 ? (
        <div className="ink-3" style={{ fontSize: 11 }}>
          No tasks yet — open the Tasks tab to create one first.
        </div>
      ) : (
        <select
          value={taskId}
          onChange={(e) => setTaskId(e.target.value)}
          style={{
            background: "var(--surface-2)",
            color: "var(--ink)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
            padding: "6px 8px",
            fontSize: 12,
            outline: "none",
          }}
        >
          {openTasks.map((t) => (
            <option
              key={t.id}
              value={t.id}
              style={{
                background: "var(--surface)",
                color: "var(--ink)",
              }}
            >
              {t.ticket ? `${t.ticket} · ` : ""}
              {t.title}
            </option>
          ))}
        </select>
      )}
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
        <button className="btn ghost" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn accent"
          onClick={() => void submit()}
          disabled={!taskId || busy}
        >
          {busy ? "Logging…" : "Create"}
        </button>
      </div>
    </div>
  );
}
