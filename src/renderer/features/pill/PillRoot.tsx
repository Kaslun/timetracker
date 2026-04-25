import { useEffect, useRef, useState } from "react";
import { PillShell } from "./PillShell";
import { BrainDumpCard } from "./BrainDumpCard";
import { selectLiveElapsed, selectLiveTodaySec, useStore } from "@/store";
import { rpc, on } from "@/lib/api";

export function PillRoot() {
  const current = useStore((s) => s.current);
  const elapsedSec = useStore(selectLiveElapsed);
  const todaySec = useStore(selectLiveTodaySec);

  const [dumpOpen, setDumpOpen] = useState(false);
  const [dumpText, setDumpText] = useState("");
  const [dumpTag, setDumpTag] = useState<string | null>(null);
  const [expandedVisible, setExpandedVisible] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    void rpc("pill:resize", { state: dumpOpen ? "dump" : "collapsed" });
  }, [dumpOpen]);

  useEffect(() => {
    return on("pill:focus-dump", () => {
      setDumpOpen(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    });
  }, []);

  useEffect(() => {
    return on("expanded:state", (s) => setExpandedVisible(s.visible));
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && dumpOpen) {
        setDumpOpen(false);
        setDumpText("");
        setDumpTag(null);
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dumpOpen]);

  const onToggle = (): void => {
    void useStore.getState().toggle();
  };

  const onBrainClick = (): void => {
    setDumpOpen((v) => !v);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const onSave = (): void => {
    const text = dumpText.trim();
    if (!text) {
      setDumpOpen(false);
      return;
    }
    void rpc("capture:create", { text, tag: dumpTag }).then(() => {
      setDumpText("");
      setDumpTag(null);
      setDumpOpen(false);
    });
  };

  const onExpandClick = (): void => {
    void rpc("window:toggleExpanded");
  };

  return (
    <div
      className="attensi"
      style={{
        background: "transparent",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: dumpOpen ? 8 : 0,
        padding: 0,
      }}
    >
      <PillShell
        current={current}
        elapsedSec={elapsedSec}
        todaySec={todaySec}
        dumpOpen={dumpOpen}
        expandedVisible={expandedVisible}
        onToggle={onToggle}
        onBrainClick={onBrainClick}
        onExpandClick={onExpandClick}
      />
      {dumpOpen && (
        <BrainDumpCard
          ref={inputRef}
          text={dumpText}
          tag={dumpTag}
          onTextChange={setDumpText}
          onTagChange={setDumpTag}
          onSubmit={onSave}
        />
      )}
    </div>
  );
}
