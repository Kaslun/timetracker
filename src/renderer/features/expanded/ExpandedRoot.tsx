import { useEffect, useState } from "react";
import { useStore } from "@/store";
import { rpc, on } from "@/lib/api";
import { Ic, TitleBar } from "@/components";
import { Cockpit } from "./Cockpit";
import { Tabs, type TabId } from "./Tabs";
import { TimelineTab } from "./TimelineTab";
import { TasksTab } from "./TasksTab";
import { InboxTab } from "./InboxTab";
import { FillTab } from "./FillTab";

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

  // Window-level shortcuts inside the expanded window:
  //   Ctrl+/   open cheatsheet
  //   Ctrl+1..4 jump tabs (power-user nicety, not in the docs)
  //   Esc      close window (or blur input if focused)
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const inField =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement;
      if (inField) {
        if (e.key === "Escape") (e.target as HTMLElement).blur();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        void rpc("window:openCheatsheet");
      } else if ((e.ctrlKey || e.metaKey) && /^[1-4]$/.test(e.key)) {
        const map: TabId[] = ["timeline", "list", "inbox", "fill"];
        const idx = parseInt(e.key, 10) - 1;
        e.preventDefault();
        setTab(map[idx]);
      } else if (e.key === "Escape") {
        void rpc("window:close");
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
        onClose={() => void rpc("window:close")}
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
