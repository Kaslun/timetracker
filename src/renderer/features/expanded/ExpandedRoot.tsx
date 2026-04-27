import { useEffect, useMemo, useState } from "react";
import { Cockpit } from "./Cockpit";
import { Tabs, type TabId } from "./Tabs";
import { TimelineTab } from "./TimelineTab";
import { TasksTab } from "./TasksTab";
import { InboxTab } from "./InboxTab";
import { FillTab } from "./FillTab";
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
  const fillSuggestions = useStore((s) => s.fillSuggestions);
  const [tab, setTab] = useState<TabId>("timeline");

  useEffect(() => {
    const off = on("expanded:tab", (next) => {
      setTab(next as TabId);
    });
    return off;
  }, []);

  // In-app, single-key shortcuts. See `useInAppShortcuts` for the rules.
  // Esc and Ctrl+1..4 stay as native handlers because they don't fit the
  // single-key/no-modifier scheme.
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
      if ((e.ctrlKey || e.metaKey) && /^[1-4]$/.test(e.key)) {
        const map: TabId[] = ["timeline", "list", "inbox", "fill"];
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
  };

  const onSettings = (): void => {
    void rpc("window:openSettings");
  };

  const onDump = (): void => {
    setTab("inbox");
  };

  const inboxCount = captures.filter((c) => !c.tag).length;
  const fillCount = fillSuggestions.length;

  return (
    <div
      className="attensi window"
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      <TitleBar
        title={fmtHeader(new Date())}
        onClose={() => void rpc("window:toggleExpanded")}
        right={
          <>
            <button
              className="btn ghost icon"
              title="Search"
              onClick={onSearch}
            >
              <Ic.Search s={13} />
            </button>
            <button
              className="btn ghost icon"
              title="Settings"
              onClick={onSettings}
            >
              <Ic.Settings s={13} />
            </button>
          </>
        }
      />
      <UpdateBanner />
      <Cockpit />
      <Tabs
        active={tab}
        onTab={setTab}
        inboxCount={inboxCount}
        fillCount={fillCount}
        onDump={onDump}
      />
      {tab === "timeline" && <TimelineTab />}
      {tab === "list" && <TasksTab />}
      {tab === "inbox" && <InboxTab />}
      {tab === "fill" && <FillTab />}
    </div>
  );
}
