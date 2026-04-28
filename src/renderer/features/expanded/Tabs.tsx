/**
 * Expanded-window tab strip.
 *
 * The tab order is user-controllable: every tab persists at
 * `settings.expandedTabOrder`, can be reordered by drag-and-drop (Framer
 * Motion's `Reorder` component) or via keyboard (`Ctrl+Shift+←/→` while a tab
 * is focused), and can be reset from Settings → General.
 *
 * Drag detection is built into Reorder.Item — a *click* without movement still
 * fires `onClick` and switches tabs, while pointer-down + drag past a small
 * threshold lifts the tab and shuffles its neighbours. That matches the
 * round-4 spec ("the whole tab is the handle — long-press or click-and-hold
 * initiates drag, so a normal click still switches tabs") without needing a
 * manual long-press timer.
 *
 * `Reorder` also handles touch and pen pointers natively — important for
 * 2-in-1 devices.
 */
import { LayoutGroup, motion, Reorder } from "framer-motion";
import { useEffect, useRef, useState, type JSX } from "react";
import { normaliseTabOrder, TAB_LABELS } from "./tabOrder";
import { Ic } from "@/components";
import { DUR, SPRING } from "@/lib/motion";
import { useMotionEnabled } from "@/lib/useMotionEnabled";
import { useStore } from "@/store";

const TAB_ICONS: Record<TabId, () => JSX.Element> = {
  timeline: () => <Ic.Calendar s={13} />,
  list: () => <Ic.Check s={13} />,
  inbox: () => <Ic.Brain s={13} />,
  fill: () => <Ic.Timer s={13} />,
  projects: () => <Ic.Folder s={13} />,
};

/**
 * Every available tab id. `fill` is back as an explicit tab in round 4, and
 * `projects` is the new fifth surface introduced in the same round.
 */
export type TabId = "timeline" | "list" | "inbox" | "fill" | "projects";

interface TabsProps {
  active: TabId;
  onTab: (id: TabId) => void;
  inboxCount: number;
  onDump: () => void;
}

export function Tabs({ active, onTab, inboxCount, onDump }: TabsProps) {
  const motionOn = useMotionEnabled();
  const expandedTabOrder = useStore((s) => s.settings.expandedTabOrder);
  const patchSettings = useStore((s) => s.patchSettings);

  const order = normaliseTabOrder(expandedTabOrder as TabId[] | null);
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>("");

  const setOrder = (next: TabId[]): void => {
    void patchSettings({ expandedTabOrder: next });
  };

  /**
   * Keyboard reorder: when a tab is focused, Ctrl+Shift+←/→ swaps it with
   * its neighbour. The current position is announced via the ARIA live
   * region below for screen readers.
   */
  const moveTab = (id: TabId, delta: -1 | 1): void => {
    const idx = order.indexOf(id);
    const target = idx + delta;
    if (idx < 0 || target < 0 || target >= order.length) return;
    const next = [...order];
    [next[idx], next[target]] = [next[target], next[idx]];
    setOrder(next);
    setLiveAnnouncement(
      `${TAB_LABELS[id]} moved to position ${target + 1} of ${order.length}.`,
    );
  };

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
        <Reorder.Group
          as="div"
          axis="x"
          values={order}
          onReorder={(next) => setOrder(next as TabId[])}
          style={{
            display: "flex",
            gap: 0,
            listStyle: "none",
            margin: 0,
            padding: 0,
          }}
        >
          {order.map((id) => {
            const isActive = id === active;
            const badge =
              id === "inbox" && inboxCount > 0 ? inboxCount : undefined;
            return (
              <Reorder.Item
                key={id}
                value={id}
                as="div"
                whileDrag={
                  motionOn
                    ? {
                        scale: 1.04,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
                        zIndex: 2,
                      }
                    : undefined
                }
                transition={motionOn ? SPRING.snap : { duration: 0 }}
                onClick={() => onTab(id)}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (!(e.ctrlKey && e.shiftKey)) {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onTab(id);
                    }
                    return;
                  }
                  if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    moveTab(id, -1);
                  } else if (e.key === "ArrowRight") {
                    e.preventDefault();
                    moveTab(id, 1);
                  }
                }}
                tabIndex={0}
                role="tab"
                aria-selected={isActive}
                title={TAB_LABELS[id]}
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
                  userSelect: "none",
                  touchAction: "none",
                }}
              >
                {/* In compact mode (`.bp-compact` set on the window root)
                    the label collapses to an icon-only chip with a tooltip;
                    parent CSS in tokens.css drives the actual hide/show. */}
                <span className="tab-icon" aria-hidden="true">
                  {TAB_ICONS[id]()}
                </span>
                <span className="tab-label">{TAB_LABELS[id]}</span>
                {badge ? <CountBadge count={badge} /> : null}
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
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
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
      {/* SR-only ARIA live region for keyboard reorders. */}
      <span
        aria-live="polite"
        style={{
          position: "absolute",
          left: -10000,
          width: 1,
          height: 1,
          overflow: "hidden",
        }}
      >
        {liveAnnouncement}
      </span>
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
