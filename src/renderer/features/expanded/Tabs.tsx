import { LayoutGroup, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Ic } from "@/components";
import { DUR, SPRING } from "@/lib/motion";
import { useMotionEnabled } from "@/lib/useMotionEnabled";

/**
 * `fill` is retained in the union for IPC back-compat (e.g.
 * `window:setExpandedTab`) but it's no longer rendered as a tab — the
 * Timeline supports drag-to-create, which replaces the Fill Gaps flow.
 */
export type TabId = "timeline" | "list" | "inbox" | "fill";

interface Tab {
  id: TabId;
  label: string;
  badge?: number;
}

interface TabsProps {
  active: TabId;
  onTab: (id: TabId) => void;
  inboxCount: number;
  onDump: () => void;
}

export function Tabs({ active, onTab, inboxCount, onDump }: TabsProps) {
  const motionOn = useMotionEnabled();
  const tabs: Tab[] = [
    { id: "timeline", label: "Timeline" },
    { id: "list", label: "Tasks" },
    {
      id: "inbox",
      label: "Inbox",
      badge: inboxCount > 0 ? inboxCount : undefined,
    },
  ];
  return (
    <div
      style={{
        display: "flex",
        gap: 0,
        padding: "0 12px",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <LayoutGroup id="tabs-bar">
        {tabs.map((tb) => {
          const isActive = tb.id === active;
          return (
            <button
              key={tb.id}
              onClick={() => onTab(tb.id)}
              style={{
                position: "relative",
                padding: "10px 12px",
                border: "none",
                background: "transparent",
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                fontWeight: isActive ? 600 : 500,
                cursor: "pointer",
                color: isActive ? "var(--ink)" : "var(--ink-3)",
                marginBottom: -1,
                display: "flex",
                alignItems: "center",
                gap: 5,
                letterSpacing: "-0.005em",
              }}
            >
              {tb.label}
              {tb.badge ? <CountBadge count={tb.badge} /> : null}
              {isActive ? (
                <motion.div
                  layoutId="tab-underline"
                  transition={motionOn ? SPRING.snap : { duration: 0 }}
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: -1,
                    height: 2,
                    background: "var(--accent)",
                    borderRadius: 1,
                  }}
                />
              ) : null}
            </button>
          );
        })}
      </LayoutGroup>
      <div style={{ flex: 1 }} />
      <button
        className="btn ghost icon"
        onClick={onDump}
        title="Brain dump"
        aria-label="Brain dump"
        style={{ alignSelf: "center" }}
      >
        <Ic.Brain s={13} />
      </button>
    </div>
  );
}

/**
 * Count badge that does a quick `1 → 1.2 → 1` bounce on increment.
 *
 * Tracks the previous count via a ref; when the new count is greater, fire a
 * single 300ms keyframe animation. Decrements (e.g. user tagged an item) snap
 * silently — bouncing on dismissal would feel like a celebration of cleanup,
 * which is the wrong vibe.
 */
function CountBadge({ count }: { count: number }) {
  const motionOn = useMotionEnabled();
  const prev = useRef(count);
  const [bumpKey, setBumpKey] = useState(0);

  useEffect(() => {
    if (count > prev.current) setBumpKey((k) => k + 1);
    prev.current = count;
  }, [count]);

  return (
    <motion.span
      key={bumpKey}
      animate={motionOn && bumpKey > 0 ? { scale: [1, 1.2, 1] } : { scale: 1 }}
      transition={{ duration: DUR.slow + 0.05, ease: "easeOut" }}
      style={{
        background: "var(--accent)",
        color: "var(--on-accent)",
        fontSize: 9,
        fontWeight: 600,
        padding: "1px 5px",
        borderRadius: 8,
        display: "inline-block",
      }}
    >
      {count}
    </motion.span>
  );
}
