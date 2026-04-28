import { useEffect, useState } from "react";
import { rpc } from "@/lib/api";
import { useStore } from "@/store";
import { clockTime, formatHM } from "@/lib/time";
import { Ic, TimeDisplay } from "@/components";

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

/**
 * End-of-day prompt: shown right before the app fully quits.
 *
 * Lists each unlogged gap from today and lets the user assign a task to it
 * (creating a fill entry per assignment) before quitting. "Skip & quit"
 * bypasses entirely; the close (X) cancels the quit and returns to normal
 * use of the app.
 */
export function EodRoot() {
  const tasks = useStore((s) => s.tasks);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [working, setWorking] = useState(false);

  useEffect(() => {
    void rpc("eod:summary").then((s) => setSummary(s));
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.preventDefault();
        void rpc("app:cancelQuit");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const onAssign = (key: string, taskId: string): void => {
    setAssignments((a) => ({ ...a, [key]: taskId }));
  };

  const onLogAndQuit = async (): Promise<void> => {
    if (!summary) return;
    setWorking(true);
    const inserts: Promise<unknown>[] = [];
    for (const gap of summary.gaps) {
      const key = String(gap.startedAt);
      const taskId = assignments[key];
      if (!taskId || taskId === SKIP_TAG) continue;
      inserts.push(
        rpc("entry:insert", {
          taskId,
          startedAt: gap.startedAt,
          endedAt: gap.endedAt,
          source: "fill",
          note: "End-of-day fill",
        }),
      );
    }
    await Promise.all(inserts);
    void rpc("app:quitNow");
  };

  const onSkip = (): void => {
    void rpc("app:quitNow");
  };

  const onCancel = (): void => {
    void rpc("app:cancelQuit");
  };

  if (!summary) {
    return (
      <div className="attensi" style={{ padding: 24, color: "var(--ink-3)" }}>
        Loading…
      </div>
    );
  }

  const assignedCount = Object.values(assignments).filter(
    (v) => v && v !== SKIP_TAG,
  ).length;

  return (
    <div className="attensi" style={{ height: "100%", padding: 6 }}>
      <div
        className="card"
        style={{
          width: "100%",
          height: "100%",
          padding: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "20px 24px 12px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div
            className="display"
            style={{
              fontSize: 20,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
            }}
          >
            Tidy up today before you go?
          </div>
          <div className="ink-3" style={{ fontSize: 12, marginTop: 6 }}>
            {formatHM(summary.loggedSec)} logged ·{" "}
            <span style={{ color: "var(--accent)" }}>
              {formatHM(summary.looseSec)} loose
            </span>{" "}
            · {summary.gaps.length} gap{summary.gaps.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="scroll" style={{ flex: 1, overflow: "auto" }}>
          {summary.gaps.length === 0 ? (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                color: "var(--ink-3)",
                fontSize: 13,
              }}
            >
              Nothing loose today. You can quit safely.
            </div>
          ) : (
            summary.gaps.map((g) => {
              const key = String(g.startedAt);
              const range = `${clockTime(new Date(g.startedAt))}–${clockTime(new Date(g.endedAt))}`;
              return (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 24px",
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
                      minWidth: 48,
                      justifyContent: "center",
                    }}
                  >
                    {g.minutes}m
                  </span>
                  <select
                    value={assignments[key] ?? ""}
                    onChange={(e) => onAssign(key, e.target.value)}
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
                    <option value={SKIP_TAG}>Leave unlogged</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.ticket ? `${t.ticket} · ` : ""}
                        {t.title} ({t.projectName})
                      </option>
                    ))}
                  </select>
                </div>
              );
            })
          )}
        </div>

        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--line)",
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <button
            className="btn ghost icon"
            title="Cancel quit"
            onClick={onCancel}
            style={{ marginRight: "auto" }}
          >
            <Ic.Close s={14} />
          </button>
          <button className="btn" onClick={onSkip} disabled={working}>
            Skip & quit
          </button>
          <button
            className="btn accent"
            onClick={() => void onLogAndQuit()}
            disabled={working || assignedCount === 0}
          >
            Log {assignedCount > 0 ? `${assignedCount} ` : ""}& quit
          </button>
        </div>
      </div>
    </div>
  );
}
