import { useEffect, useMemo, useState } from "react";
import { Cockpit } from "./Cockpit";
import { Tabs, type TabId } from "./Tabs";
import { TimelineTab } from "./TimelineTab";
import { TasksTab } from "./TasksTab";
import { InboxTab } from "./InboxTab";
import { Ic, TitleBar } from "@/components";
import { rpc, on } from "@/lib/api";
import { useStore } from "@/store";
import { useInAppShortcuts } from "@/lib/useInAppShortcuts";
import { UpdateBanner } from "@/features/update/UpdateBanner";

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
  const [tab, setTab] = useState<TabId>("timeline");

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
      if ((e.ctrlKey || e.metaKey) && /^[1-3]$/.test(e.key)) {
        const map: TabId[] = ["timeline", "list", "inbox"];
        const idx = parseInt(e.key, 10) - 1;
        e.preventDefault();
        setTab(map[idx]);
      } else if (e.key === "Escape") {
        // In single-window morph, Esc collapses back to pill rather than
        // closing the window — the pill is the always-on surface.
        void rpc("window:toggleExpanded");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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

  return (
    <div
      className="attensi window"
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      <TitleBar
        title={fmtHeader(new Date())}
        onClose={() => void rpc("window:toggleExpanded")}
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
      {/* `fill` tab is intentionally not rendered — see Tabs.tsx note. */}
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
