/**
 * Fill gaps tab — fourth surface in the expanded window.
 *
 * Lists today's untracked time gaps (computed by `eod:summary` in the main
 * process) and lets the user attach each one to a task without going through
 * the EoD-on-quit flow. Useful mid-day when you realise you forgot to start a
 * timer — open the tab, pick the right task per gap, hit Log.
 *
 * Reuses `eod:summary` rather than introducing a new RPC: the data model is
 * identical, only the UX wrapper differs (no "& quit" button, just "Log gap"
 * per row).
 */
import { useEffect, useState } from "react";
import { rpc } from "@/lib/api";
import { useStore } from "@/store";
import { clockTime, formatHM } from "@/lib/time";
import { EmptyState, Ic, TimeDisplay } from "@/components";

interface Gap {
  startedAt: number;
  endedAt: number;
  minutes: number;
}

interface Summary {
  loggedSec: number;
  looseSec: number;
  gaps: Gap[];
}

const SKIP_TAG = "__skip__";

export function FillTab() {
  const tasks = useStore((s) => s.tasks);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = (): void => {
    void rpc("eod:summary").then(setSummary);
  };

  useEffect(() => {
    refresh();
  }, []);

  const fillOne = async (g: Gap): Promise<void> => {
    const key = String(g.startedAt);
    const taskId = assignments[key];
    if (!taskId || taskId === SKIP_TAG) return;
    setBusy(key);
    try {
      await rpc("entry:insert", {
        taskId,
        startedAt: g.startedAt,
        endedAt: g.endedAt,
        source: "fill",
        note: "Fill gap",
      });
      refresh();
    } finally {
      setBusy(null);
    }
  };

  if (!summary) {
    return (
      <div
        style={{
          flex: 1,
          padding: 24,
          color: "var(--ink-3)",
          fontSize: 12,
        }}
      >
        Loading…
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        <Ic.Timer s={13} />
        <span
          className="display"
          style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}
        >
          Fill gaps · today
        </span>
        <div style={{ flex: 1 }} />
        <span className="ink-3" style={{ fontSize: 11 }}>
          {formatHM(summary.loggedSec)} logged ·{" "}
          <span style={{ color: "var(--accent)" }}>
            {formatHM(summary.looseSec)} loose
          </span>
        </span>
      </div>

      <div className="scroll" style={{ flex: 1, overflow: "auto" }}>
        {summary.gaps.length === 0 ? (
          <EmptyState
            title="No loose time today"
            hint="Nothing to fill — every minute since you started is accounted for."
          />
        ) : (
          summary.gaps.map((g) => {
            const key = String(g.startedAt);
            const range = `${clockTime(new Date(g.startedAt))}–${clockTime(new Date(g.endedAt))}`;
            const picked = assignments[key];
            return (
              <div
                key={key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 16px",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <TimeDisplay
                  value={range}
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-2)",
                    width: 90,
                    flexShrink: 0,
                  }}
                />
                <span
                  className="chip"
                  style={{
                    flexShrink: 0,
                    minWidth: 40,
                    justifyContent: "center",
                  }}
                >
                  {g.minutes}m
                </span>
                <select
                  value={picked ?? ""}
                  onChange={(e) =>
                    setAssignments((a) => ({ ...a, [key]: e.target.value }))
                  }
                  className="chip"
                  style={{
                    flex: 1,
                    cursor: "pointer",
                    background: "var(--surface-2)",
                    color: "var(--ink)",
                    borderColor: "var(--line-2)",
                    padding: "4px 8px",
                  }}
                >
                  <option value="">Assign to task…</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.ticket ? `${t.ticket} · ` : ""}
                      {t.title} ({t.projectName})
                    </option>
                  ))}
                </select>
                <button
                  className="btn primary"
                  disabled={
                    !picked || picked === SKIP_TAG || busy === key
                  }
                  onClick={() => void fillOne(g)}
                  style={{ padding: "4px 8px", fontSize: 11 }}
                >
                  {busy === key ? "Logging…" : "Log gap"}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
