import { useEffect, useMemo, useState } from "react";
import { rpc, on } from "@/lib/api";
import type { RetroNudgePayload, FillSuggestion } from "@shared/types";

export function RetroFillToast() {
  const [payload, setPayload] = useState<RetroNudgePayload | null>(null);
  const [picked, setPicked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void rpc("nudge:active", { kind: "retro_fill" }).then((p) => {
      if (p && p.kind === "retro_fill") {
        setPayload(p);
        const init: Record<string, boolean> = {};
        for (const s of p.suggestions) init[s.id] = s.picked;
        setPicked(init);
      }
    });
    const off = on("nudge:fire", (p) => {
      if (p.kind === "retro_fill") {
        setPayload(p);
        const init: Record<string, boolean> = {};
        for (const s of p.suggestions) init[s.id] = s.picked;
        setPicked(init);
      }
    });
    return off;
  }, []);

  const visible: FillSuggestion[] = useMemo(
    () => payload?.suggestions.slice(0, 3) ?? [],
    [payload],
  );
  const pickedCount = visible.filter((s) => picked[s.id]).length;
  const pickedMin = visible
    .filter((s) => picked[s.id])
    .reduce((a, s) => a + s.durationMinutes, 0);

  const onLog = async (): Promise<void> => {
    if (!payload) return;
    const chosen = payload.suggestions
      .filter((s) => picked[s.id])
      .map((s) => ({ ...s, picked: true }));
    if (chosen.length) {
      await rpc("fill:apply", { suggestions: chosen });
    }
    await rpc("nudge:dismiss", { kind: "retro_fill" });
    void rpc("window:close");
  };

  const onLater = async (): Promise<void> => {
    await rpc("nudge:dismiss", { kind: "retro_fill" });
    void rpc("window:close");
  };

  return (
    <div className="attensi" style={{ height: "100%", padding: 6 }}>
      <div
        className="card"
        style={{
          width: "100%",
          height: "100%",
          padding: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div
            className="display"
            style={{
              fontSize: 16,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
            }}
          >
            A {payload ? formatGap(payload.durationMinutes) : ""} gap just
            appeared
          </div>
          <div className="ink-3" style={{ fontSize: 11, marginTop: 3 }}>
            We pulled what you were doing — pick what to log
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {visible.map((s) => (
            <label
              key={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                borderBottom: "1px solid var(--line)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={!!picked[s.id]}
                onChange={(e) =>
                  setPicked((m) => ({ ...m, [s.id]: e.target.checked }))
                }
                style={{ accentColor: "var(--accent)" }}
              />
              <span className="chip">{s.src}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    lineHeight: 1.3,
                  }}
                >
                  {s.label}
                </div>
                <div className="mono ink-3" style={{ fontSize: 10 }}>
                  {s.meta}
                </div>
              </div>
            </label>
          ))}
          {visible.length === 0 && (
            <div
              className="ink-3"
              style={{ padding: 20, textAlign: "center", fontSize: 12 }}
            >
              Nothing to suggest — gap is yours.
            </div>
          )}
        </div>
        <div
          style={{
            padding: "10px 14px",
            display: "flex",
            gap: 6,
            alignItems: "center",
            borderTop: "1px solid var(--line)",
          }}
        >
          <span className="ink-3" style={{ fontSize: 11, flex: 1 }}>
            {pickedCount} picked · {formatGap(pickedMin)}
          </span>
          <button className="btn" onClick={() => void onLater()}>
            Later
          </button>
          <button
            className="btn accent"
            onClick={() => void onLog()}
            disabled={pickedCount === 0}
          >
            Log
          </button>
        </div>
      </div>
    </div>
  );
}

function formatGap(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
