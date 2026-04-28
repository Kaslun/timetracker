/**
 * Per-day, multi-range work-hours editor.
 *
 * One row per weekday (Mon → Sun). Each row carries an enable toggle and
 * up to `MAX_WORK_HOURS_RANGES` time ranges. Saving fires after every edit
 * (the store debounces persistence). Validation runs locally so invalid
 * ranges flash red without a round-trip.
 *
 * Rendered inside the Nudges section so the gate sits next to the
 * toggles that depend on it.
 */
import { useMemo } from "react";
import type {
  WeekdayId,
  WorkHours,
  WorkHoursDay,
  WorkHoursRange,
} from "@shared/types";
import { WEEKDAY_IDS } from "@shared/types";
import {
  DEFAULT_WORK_HOURS,
  MAX_WORK_HOURS_RANGES,
  emptyWorkHours,
} from "@shared/constants";
import { validateDayRanges } from "@shared/workHours";
import { Toggle } from "../Toggle";
import { Ic } from "@/components";

export function WorkHoursEditor({
  value,
  onChange,
}: {
  value: WorkHours;
  onChange: (next: WorkHours) => void;
}) {
  const setDay = (id: WeekdayId, patch: Partial<WorkHoursDay>): void => {
    onChange({ ...value, [id]: { ...value[id], ...patch } });
  };

  const setRange = (
    id: WeekdayId,
    rangeIndex: number,
    patch: Partial<WorkHoursRange>,
  ): void => {
    const ranges = value[id].ranges.map((r, i) =>
      i === rangeIndex ? { ...r, ...patch } : r,
    );
    setDay(id, { ranges });
  };

  const addRange = (id: WeekdayId): void => {
    const cur = value[id].ranges;
    if (cur.length >= MAX_WORK_HOURS_RANGES) return;
    const last = cur[cur.length - 1];
    setDay(id, { ranges: [...cur, { from: last.to, to: last.to }] });
  };

  const removeRange = (id: WeekdayId, index: number): void => {
    const cur = value[id].ranges;
    if (cur.length <= 1) return;
    setDay(id, { ranges: cur.filter((_, i) => i !== index) });
  };

  const copyMonToWeekdays = (): void => {
    const mon = value.Mon;
    const next = { ...value, Tue: mon, Wed: mon, Thu: mon, Fri: mon };
    onChange(next);
  };

  const matchAllEnabled = (): void => {
    const seed =
      WEEKDAY_IDS.find((d) => value[d].enabled) ??
      WEEKDAY_IDS.find((d) => value[d].ranges.length > 0);
    if (!seed) return;
    const template = value[seed];
    const next = { ...value };
    for (const d of WEEKDAY_IDS) {
      if (next[d].enabled) {
        next[d] = { ...template, enabled: true };
      }
    }
    onChange(next);
  };

  const reset = (): void => onChange(DEFAULT_WORK_HOURS);

  const clearAll = (): void => onChange(emptyWorkHours());

  const anyEnabled = WEEKDAY_IDS.some((d) => value[d].enabled);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {WEEKDAY_IDS.map((id) => (
        <DayRow
          key={id}
          id={id}
          day={value[id]}
          onToggle={(enabled) => setDay(id, { enabled })}
          onRangeChange={(idx, patch) => setRange(id, idx, patch)}
          onAddRange={() => addRange(id)}
          onRemoveRange={(idx) => removeRange(id, idx)}
        />
      ))}

      <WeeklyPreview hours={value} />

      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          alignItems: "center",
          marginTop: 8,
          paddingTop: 10,
          borderTop: "1px dashed var(--line)",
        }}
      >
        <button className="btn ghost" onClick={copyMonToWeekdays}>
          Copy Monday to weekdays
        </button>
        <button
          className="btn ghost"
          onClick={matchAllEnabled}
          disabled={!anyEnabled}
        >
          Match all days
        </button>
        <button className="btn ghost" onClick={reset}>
          Reset to default
        </button>
        <button className="btn ghost" onClick={clearAll}>
          Disable all
        </button>
      </div>
    </div>
  );
}

function DayRow({
  id,
  day,
  onToggle,
  onRangeChange,
  onAddRange,
  onRemoveRange,
}: {
  id: WeekdayId;
  day: WorkHoursDay;
  onToggle: (enabled: boolean) => void;
  onRangeChange: (index: number, patch: Partial<WorkHoursRange>) => void;
  onAddRange: () => void;
  onRemoveRange: (index: number) => void;
}) {
  const validation = useMemo(() => validateDayRanges(day), [day]);
  const dim = !day.enabled;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "8px 0",
        borderBottom: "1px solid var(--line)",
        opacity: dim ? 0.55 : 1,
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--ink)",
          minWidth: 32,
          paddingTop: 6,
        }}
      >
        {id}
      </span>
      <div style={{ paddingTop: 4 }}>
        <Toggle on={day.enabled} onChange={onToggle} />
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {day.ranges.map((r, idx) => (
          <div
            key={idx}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <input
              type="time"
              value={r.from}
              disabled={!day.enabled}
              onChange={(e) => onRangeChange(idx, { from: e.target.value })}
              style={timeInputStyle}
            />
            <span className="ink-3" style={{ fontSize: 11 }}>
              to
            </span>
            <input
              type="time"
              value={r.to}
              disabled={!day.enabled}
              onChange={(e) => onRangeChange(idx, { to: e.target.value })}
              style={timeInputStyle}
            />
            {day.ranges.length > 1 ? (
              <button
                className="btn ghost icon"
                title="Remove range"
                aria-label="Remove range"
                onClick={() => onRemoveRange(idx)}
                style={{ width: 22, height: 22, padding: 0 }}
              >
                <Ic.Close s={10} />
              </button>
            ) : null}
          </div>
        ))}
        {day.enabled && day.ranges.length < MAX_WORK_HOURS_RANGES ? (
          <button
            className="btn ghost"
            onClick={onAddRange}
            style={{
              alignSelf: "flex-start",
              fontSize: 11,
              padding: "2px 8px",
            }}
          >
            + Add range
          </button>
        ) : null}
        {day.enabled && !validation.ok ? (
          <div
            style={{
              fontSize: 10,
              color: "var(--danger, #c33)",
              marginTop: 2,
            }}
          >
            {validation.errors[0]}
          </div>
        ) : null}
      </div>
    </div>
  );
}

const timeInputStyle: React.CSSProperties = {
  background: "var(--surface-2)",
  border: "1px solid var(--line)",
  borderRadius: 6,
  padding: "3px 6px",
  fontSize: 11,
  color: "var(--ink)",
  fontFamily: "var(--mono)",
};

/**
 * Stacked per-day bar showing the active windows. Each enabled range
 * renders as a filled segment proportional to the 24h day. Updates live
 * as the user edits.
 */
function WeeklyPreview({ hours }: { hours: WorkHours }) {
  return (
    <div
      style={{
        marginTop: 12,
        padding: "10px 12px",
        background: "var(--surface-2)",
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div
        className="display"
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: "var(--ink-3)",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        Weekly preview
      </div>
      {WEEKDAY_IDS.map((id) => (
        <PreviewBar key={id} label={id} day={hours[id]} />
      ))}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 9,
          color: "var(--ink-4)",
          marginTop: 2,
          paddingLeft: 32,
        }}
      >
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
    </div>
  );
}

function PreviewBar({ label, day }: { label: WeekdayId; day: WorkHoursDay }) {
  const segments = day.enabled
    ? day.ranges.map((r) => {
        const [fh, fm] = r.from.split(":").map((s) => parseInt(s, 10));
        const [th, tm] = r.to.split(":").map((s) => parseInt(s, 10));
        if (
          Number.isNaN(fh) ||
          Number.isNaN(fm) ||
          Number.isNaN(th) ||
          Number.isNaN(tm)
        )
          return null;
        const fromMin = fh * 60 + fm;
        const toMin = th * 60 + tm;
        if (toMin <= fromMin) return null;
        return {
          left: `${(fromMin / 1440) * 100}%`,
          width: `${((toMin - fromMin) / 1440) * 100}%`,
        };
      })
    : [];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        opacity: day.enabled ? 1 : 0.45,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: "var(--ink-3)",
          minWidth: 24,
          fontFamily: "var(--mono)",
        }}
      >
        {label}
      </span>
      <div
        style={{
          position: "relative",
          flex: 1,
          height: 8,
          background: "var(--surface)",
          borderRadius: 4,
          border: "1px solid var(--line)",
          overflow: "hidden",
        }}
      >
        {segments.map((s, i) =>
          s ? (
            <div
              key={i}
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: s.left,
                width: s.width,
                background: "var(--accent)",
              }}
            />
          ) : null,
        )}
      </div>
    </div>
  );
}
