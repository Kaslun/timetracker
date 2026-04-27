import { useEffect, useState } from "react";
import type { IdleNudgePayload } from "@shared/types";
import { rpc, on } from "@/lib/api";

const OPTIONS: {
  choice: "discard" | "meeting" | "keep" | "custom";
  emoji: string;
  label: string;
}[] = [
  { choice: "discard", emoji: "☕", label: "Break — discard" },
  { choice: "meeting", emoji: "💬", label: "Meeting / call" },
  { choice: "keep", emoji: "📝", label: "Keep logging to current task" },
  { choice: "custom", emoji: "✏️", label: "Something else…" },
];

export function IdleRecoveryToast() {
  const [payload, setPayload] = useState<IdleNudgePayload | null>(null);

  useEffect(() => {
    void rpc("nudge:active", { kind: "idle_recover" }).then((p) => {
      if (p && p.kind === "idle_recover") setPayload(p);
    });
    const off = on("nudge:fire", (p) => {
      if (p.kind === "idle_recover") setPayload(p);
    });
    return off;
  }, []);

  const onPick = async (
    choice: "discard" | "meeting" | "keep" | "custom",
  ): Promise<void> => {
    if (!payload) return;
    await rpc("idle:resolve", {
      choice,
      gapStartedAt: payload.gapStartedAt,
      gapEndedAt: payload.gapEndedAt,
      taskId: payload.taskIdAtIdle ?? undefined,
    });
    void rpc("window:close");
  };

  const minutes = payload?.durationMinutes ?? 0;

  return (
    <div className="attensi" style={{ height: "100%", padding: 6 }}>
      <div
        className="card"
        style={{
          width: "100%",
          height: "100%",
          padding: "20px 20px 16px",
          position: "relative",
        }}
      >
        <div
          className="mono num"
          style={{
            position: "absolute",
            top: -10,
            right: -10,
            width: 36,
            minWidth: 36,
            height: 28,
            borderRadius: 14,
            background: "var(--accent)",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "var(--shadow-sm)",
            padding: "0 6px",
          }}
        >
          {minutes}m
        </div>
        <div
          className="display"
          style={{
            fontSize: 18,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            lineHeight: 1.2,
          }}
        >
          Welcome back 👋
        </div>
        <div
          className="ink-2"
          style={{
            fontSize: 12,
            marginTop: 6,
            marginBottom: 16,
            lineHeight: 1.4,
          }}
        >
          Your keyboard was quiet for{" "}
          <span style={{ fontWeight: 600, color: "var(--ink)" }}>
            {minutes} min
          </span>
          . What were you up to?
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {OPTIONS.map((o) => (
            <button
              key={o.choice}
              className="btn"
              onClick={() => void onPick(o.choice)}
              style={{
                justifyContent: "flex-start",
                padding: "8px 12px",
                fontSize: 12,
              }}
            >
              <span style={{ fontSize: 14 }}>{o.emoji}</span>
              <span>{o.label}</span>
            </button>
          ))}
        </div>
        <div
          className="mono ink-3"
          style={{ fontSize: 10, marginTop: 10, textAlign: "right" }}
        >
          Auto-discards in 2h
        </div>
      </div>
    </div>
  );
}
