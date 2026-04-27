import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PillShell } from "./PillShell";
import { BrainDumpCard } from "./BrainDumpCard";
import { selectLiveElapsed, selectLiveTodaySec, useStore } from "@/store";
import { rpc, on } from "@/lib/api";
import { useInAppShortcuts } from "@/lib/useInAppShortcuts";
import { DUR } from "@/lib/motion";
import { useMotionEnabled } from "@/lib/useMotionEnabled";

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

  // In-app shortcuts for the pill. Brain-dump key opens the dump card here
  // (vs. the inbox tab in the expanded window).
  useInAppShortcuts(
    useMemo(
      () => ({
        toggleTimerLocal: () => void useStore.getState().toggle(),
        switchTask: () => void rpc("window:setExpandedTab", { tab: "list" }),
        expandWindow: () => void rpc("window:toggleExpanded"),
        brainDump: onBrainClick,
        cheatsheet: () => void rpc("window:openCheatsheet"),
      }),
      [],
    ),
  );

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
      <BrainDump
        open={dumpOpen}
        text={dumpText}
        tag={dumpTag}
        onTextChange={setDumpText}
        onTagChange={setDumpTag}
        onSubmit={onSave}
        inputRef={inputRef}
      />
    </div>
  );
}

function BrainDump({
  open,
  text,
  tag,
  onTextChange,
  onTagChange,
  onSubmit,
  inputRef,
}: {
  open: boolean;
  text: string;
  tag: string | null;
  onTextChange: (v: string) => void;
  onTagChange: (v: string | null) => void;
  onSubmit: () => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const motionOn = useMotionEnabled();
  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          key="dump"
          initial={motionOn ? { opacity: 0, y: -8 } : false}
          animate={{ opacity: 1, y: 0 }}
          exit={motionOn ? { opacity: 0, y: -8 } : { opacity: 0 }}
          transition={{ duration: motionOn ? DUR.base : 0, ease: "easeOut" }}
        >
          <BrainDumpCard
            ref={inputRef}
            text={text}
            tag={tag}
            onTextChange={onTextChange}
            onTagChange={onTagChange}
            onSubmit={onSubmit}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
