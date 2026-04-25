import { useMemo, useState } from "react";
import { useStore } from "@/store";
import { rpc } from "@/lib/api";
import { formatHM } from "@/lib/time";

export function FillTab() {
  const initialSuggestions = useStore((s) => s.fillSuggestions);
  const [picked, setPicked] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const s of initialSuggestions) init[s.id] = s.picked;
    return init;
  });

  const totalLogMinutes = useMemo(
    () =>
      initialSuggestions
        .filter((s) => picked[s.id])
        .reduce((acc, s) => acc + s.durationMinutes, 0),
    [initialSuggestions, picked],
  );
  const pickedCount = Object.values(picked).filter(Boolean).length;

  const onLog = async (): Promise<void> => {
    const selected = initialSuggestions.filter((s) => picked[s.id]);
    if (selected.length === 0) return;
    await rpc("fill:apply", { suggestions: selected });
    await rpc("window:setExpandedTab", { tab: "timeline" });
  };

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
        style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)" }}
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
          Where did the{" "}
          <span
            style={{
              background: "color-mix(in oklab, var(--accent) 18%, transparent)",
              padding: "0 4px",
              borderRadius: 3,
            }}
          >
            last 2 hours
          </span>{" "}
          go?
        </div>
        <div className="ink-3" style={{ fontSize: 11, marginTop: 4 }}>
          Pulled from your apps. Nothing logged until you say so.
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 12,
          }}
        >
          <span className="mono ink-3" style={{ fontSize: 10, width: 30 }}>
            10:30
          </span>
          <div style={{ flex: 1, position: "relative", height: 18 }}>
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: "16%",
                height: 18,
                background: "var(--accent)",
                borderRadius: "4px 2px 2px 4px",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "16%",
                width: "72%",
                height: 18,
                border: "1.5px dashed var(--accent)",
                borderRadius: 2,
                background:
                  "color-mix(in oklab, var(--accent) 8%, transparent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  color: "var(--accent)",
                  fontWeight: 600,
                }}
              >
                2h unlogged
              </span>
            </div>
            <div
              style={{
                position: "absolute",
                left: "88%",
                width: "12%",
                height: 18,
                background: "var(--ink-4)",
                borderRadius: "2px 4px 4px 2px",
              }}
            />
          </div>
          <span className="mono ink-3" style={{ fontSize: 10, width: 30 }}>
            14:30
          </span>
        </div>
      </div>
      <div className="scroll" style={{ flex: 1, overflow: "auto" }}>
        <div
          style={{
            padding: "10px 14px 4px",
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
          }}
        >
          <span
            className="display"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--ink-2)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            We saw you doing
          </span>
          <span className="mono ink-3" style={{ fontSize: 10 }}>
            Drag → timeline
          </span>
        </div>
        {initialSuggestions.map((s) => (
          <label
            key={s.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderBottom: "1px solid var(--line)",
              background: picked[s.id]
                ? "color-mix(in oklab, var(--accent) 4%, transparent)"
                : "transparent",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={!!picked[s.id]}
              onChange={(e) =>
                setPicked((p) => ({ ...p, [s.id]: e.target.checked }))
              }
              style={{ accentColor: "var(--accent)" }}
            />
            <span className="mono ink-3" style={{ fontSize: 10, width: 40 }}>
              {s.at}
            </span>
            <span className="chip">{s.src}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: 1.3,
                }}
              >
                {s.label}
              </div>
              <div
                className="mono ink-3"
                style={{ fontSize: 10, marginTop: 2 }}
              >
                {s.meta}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 1,
              }}
            >
              <span
                className="mono"
                style={{ fontSize: 10, color: "var(--ink-3)" }}
              >
                {Math.round(s.confidence * 100)}%
              </span>
              <div
                style={{
                  width: 36,
                  height: 3,
                  background: "var(--surface-2)",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${s.confidence * 100}%`,
                    height: "100%",
                    background: "var(--accent)",
                  }}
                />
              </div>
            </div>
          </label>
        ))}
      </div>
      <div
        style={{
          padding: "10px 14px",
          borderTop: "1px solid var(--line)",
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        <span className="ink-3" style={{ fontSize: 11, flex: 1 }}>
          {pickedCount} picked · {formatHM(totalLogMinutes * 60)} to log
        </span>
        <button className="btn">Skip</button>
        <button
          className="btn accent"
          disabled={pickedCount === 0}
          onClick={() => void onLog()}
        >
          Log selected
        </button>
      </div>
    </div>
  );
}
