/**
 * Low-key "Top priority today: X" banner.
 *
 * Listens for the `topPriority:fire` event broadcast by the main-side
 * `topPriorityNudge` service. The banner renders just above the pill,
 * stays for 12s (or until dismissed/started), and never auto-re-shows
 * inside the same session — the service itself only fires once per
 * work-day so this is belt-and-braces.
 *
 * Click "Start" → starts the suggested task via the standard `task:start`
 * IPC. Click × → dismisses without action.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { TopPriorityNudgePayload } from "@shared/types";
import { on } from "@/lib/api";
import { useStore } from "@/store";

const AUTO_DISMISS_MS = 12_000;

export function TopPriorityBanner() {
  const [payload, setPayload] = useState<TopPriorityNudgePayload | null>(null);

  useEffect(() => {
    return on("topPriority:fire", (p) => setPayload(p));
  }, []);

  useEffect(() => {
    if (!payload) return;
    const t = setTimeout(() => setPayload(null), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [payload]);

  const start = (): void => {
    if (!payload) return;
    void useStore.getState().start(payload.taskId);
    setPayload(null);
  };

  return (
    <AnimatePresence>
      {payload ? (
        <motion.div
          key={payload.taskId}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line-2)",
            borderRadius: "var(--radius)",
            padding: "8px 10px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 11,
            boxShadow: "var(--shadow-md)",
          }}
          role="status"
          aria-live="polite"
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: payload.projectColor,
              flexShrink: 0,
            }}
          />
          <span className="ink-3">Top priority today:</span>
          <span
            style={{
              fontWeight: 500,
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={`${payload.taskTitle} · ${payload.projectName}`}
          >
            {payload.ticket ? `${payload.ticket} ` : ""}
            {payload.taskTitle}
          </span>
          <button
            type="button"
            onClick={start}
            className="btn primary"
            style={{ padding: "2px 8px", fontSize: 10 }}
          >
            Start
          </button>
          <button
            type="button"
            onClick={() => setPayload(null)}
            aria-label="Dismiss"
            title="Dismiss"
            style={{
              background: "transparent",
              border: 0,
              color: "var(--ink-3)",
              cursor: "pointer",
              padding: "0 2px",
              fontSize: 14,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
