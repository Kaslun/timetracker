import { useEffect, useMemo, useState } from "react";
import { Cockpit } from "./Cockpit";
import { Tabs, type TabId } from "./Tabs";
import { TimelineTab } from "./TimelineTab";
import { TasksTab } from "./TasksTab";
import { InboxTab } from "./InboxTab";
import { FillTab } from "./FillTab";
import { ProjectsTab } from "./ProjectsTab";
import { normaliseTabOrder } from "./tabOrder";
import { useContainerWidth } from "@/lib/useContainerWidth";
import { Ic, TitleBar } from "@/components";
import { rpc, on } from "@/lib/api";
import { useStore } from "@/store";
import { useInAppShortcuts } from "@/lib/useInAppShortcuts";
import { UpdateBanner } from "@/features/update/UpdateBanner";
import { flushDraftAsCapture } from "@/lib/brainDumpDraft";

/**
 * Quit handler invoked by the title bar's close button. Per round 4:
 *   1. Save any in-progress brain dump as a draft capture (no prompt).
 *   2. Tell main to quit immediately (no confirmation dialog).
 * Failures along the way are intentionally swallowed — the user clicked X,
 * they expect the app to disappear.
 */
async function quitFromExpanded(): Promise<void> {
  await flushDraftAsCapture();
  await rpc("app:quitNow");
}

function fmtHeader(d: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `Today, ${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`;
}

export function ExpandedRoot() {
  const captures = useStore((s) => s.captures);
  const expandedTabOrder = useStore((s) => s.settings.expandedTabOrder);
  const [tab, setTab] = useState<TabId>("timeline");

  // Recompute tab list whenever the persisted order changes — this powers
  // both the visible tab strip and the Ctrl+1..N shortcut routing below.
  const tabOrder = useMemo(
    () => normaliseTabOrder(expandedTabOrder as TabId[] | null),
    [expandedTabOrder],
  );

  useEffect(() => {
    const off = on("expanded:tab", (next) => {
      setTab(next as TabId);
    });
    return off;
  }, []);

  useInAppShortcuts(
    useMemo(
      () => ({
        toggleTimerLocal: () => void useStore.getState().toggle(),
        switchTask: () => setTab("list"),
        expandWindow: () => void rpc("window:toggleExpanded"),
        brainDump: () => setTab("inbox"),
        cheatsheet: () => void rpc("window:openCheatsheet"),
      }),
      [],
    ),
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const inField =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement;
      if (inField) {
        if (e.key === "Escape") (e.target as HTMLElement).blur();
        return;
      }
      // Ctrl/Cmd + 1..N → jump to the Nth tab in the user's persisted order.
      // Earlier rounds hardcoded 1..3 → timeline/list/inbox; with 5 tabs and
      // user-defined ordering we route through the live `tabOrder` array.
      if ((e.ctrlKey || e.metaKey) && /^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < tabOrder.length) {
          e.preventDefault();
          setTab(tabOrder[idx]);
        }
      } else if (e.key === "Escape") {
        // In single-window morph, Esc collapses back to pill rather than
        // closing the window — the pill is the always-on surface.
        void rpc("window:toggleExpanded");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [tabOrder]);

  const onSearch = (): void => {
    setTab("list");
    // Defer to the next tick so the TasksTab search input is mounted before
    // we focus it. TasksTab subscribes to this event via `window.addEventListener`.
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("attensi:focus-search"));
    }, 0);
  };

  const onSettings = (): void => {
    void rpc("window:openSettings");
  };

  const onCollapse = (): void => {
    void rpc("window:toggleExpanded");
  };

  const onDump = (): void => {
    setTab("inbox");
  };

  const inboxCount = captures.filter((c) => !c.tag).length;
  const { ref, breakpoint } = useContainerWidth<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`attensi window bp-${breakpoint}`}
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      <TitleBar
        title={fmtHeader(new Date())}
        onClose={() => void quitFromExpanded()}
      />
      <SubHeader
        onSearch={onSearch}
        onSettings={onSettings}
        onCollapse={onCollapse}
      />
      <UpdateBanner />
      <Cockpit />
      <Tabs
        active={tab}
        onTab={setTab}
        inboxCount={inboxCount}
        onDump={onDump}
      />
      {tab === "timeline" && <TimelineTab />}
      {tab === "list" && <TasksTab />}
      {tab === "inbox" && <InboxTab />}
      {tab === "fill" && <FillTab />}
      {tab === "projects" && <ProjectsTab />}
    </div>
  );
}

interface SubHeaderProps {
  onSearch: () => void;
  onSettings: () => void;
  onCollapse: () => void;
}

/**
 * Sub-header strip below the OS title bar.
 *
 * Hosts search, settings and the "back to pill" chevron — lifted out of the
 * title bar so the OS controls (close/min/max) sit alone. Search jumps to
 * the Tasks tab and focuses its in-tab search field, where the create-task
 * affordance lives.
 */
function SubHeader({ onSearch, onSettings, onCollapse }: SubHeaderProps) {
  return (
    <div
      className="no-drag"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "6px 10px",
        borderBottom: "1px solid var(--line)",
        background: "var(--bg-2)",
      }}
    >
      <button
        className="btn ghost icon"
        title="Search tasks"
        aria-label="Search tasks"
        onClick={onSearch}
      >
        <Ic.Search s={13} />
      </button>
      <div style={{ flex: 1 }} />
      <button
        className="btn ghost icon"
        title="Settings"
        aria-label="Settings"
        onClick={onSettings}
      >
        <Ic.Settings s={13} />
      </button>
      <button
        className="btn ghost icon"
        title="Collapse to pill"
        aria-label="Collapse to pill"
        onClick={onCollapse}
      >
        <Ic.Chevron dir="up" s={13} />
      </button>
    </div>
  );
}
