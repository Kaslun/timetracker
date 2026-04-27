import type { CurrentTaskView } from "@shared/types";
import { shortcutLabel } from "@shared/hotkeys";
import { PillButton } from "./PillButton";
import { formatElapsed, formatHM } from "@/lib/time";
import {
  ChevronRotate,
  DigitRoll,
  Dot,
  Ic,
  PlayPauseIcon,
  Swatch,
} from "@/components";

export interface PillShellProps {
  current: CurrentTaskView;
  elapsedSec: number;
  todaySec: number;
  dumpOpen: boolean;
  expandedVisible: boolean;
  onToggle: () => void;
  onBrainClick: () => void;
  onExpandClick: () => void;
  onQuitClick: () => void;
}

export function PillShell({
  current,
  elapsedSec,
  todaySec,
  dumpOpen,
  expandedVisible,
  onToggle,
  onBrainClick,
  onExpandClick,
  onQuitClick,
}: PillShellProps) {
  const idle = !current.running;
  const ticket = current.ticket;
  const ticketPrefix = ticket?.split("-")[0] ?? "";
  const ticketNumber = ticket?.split("-")[1] ?? "";

  return (
    <div
      className="pill-shell drag"
      style={{ display: "flex", alignItems: "stretch", height: 56, width: 380 }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 10px",
          minWidth: 56,
          background: idle ? "var(--surface-2)" : "var(--accent-2)",
          borderRight: "1px solid var(--line)",
          position: "relative",
        }}
      >
        <Swatch color={current.projectColor} size={6} />
        {ticketPrefix && (
          <div
            className="mono"
            style={{
              fontSize: 9,
              color: idle ? "var(--ink-3)" : "var(--accent-ink)",
              letterSpacing: "0.08em",
              marginTop: 2,
              fontWeight: 600,
            }}
          >
            {ticketPrefix}
          </div>
        )}
        <div
          className="display"
          style={{
            fontSize: 22,
            lineHeight: 1,
            fontWeight: 600,
            color: idle ? "var(--ink-2)" : "var(--accent)",
            marginTop: -1,
            letterSpacing: "-0.02em",
          }}
        >
          {idle ? "—" : ticketNumber || "·"}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          padding: "8px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          minWidth: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Dot running={current.running} />
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              color: idle ? "var(--ink-3)" : "var(--ink)",
            }}
          >
            {idle ? "No task running" : current.title}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <DigitRoll
            value={formatElapsed(elapsedSec)}
            className="mono num"
            style={{
              fontSize: 17,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: idle ? "var(--ink-3)" : "var(--ink)",
            }}
          />
          <span className="mono num ink-3" style={{ fontSize: 10 }}>
            {idle
              ? `today · ${formatHM(todaySec)}`
              : `/today ${formatHM(todaySec)}`}
          </span>
        </div>
      </div>

      <div
        className="no-drag"
        style={{
          display: "flex",
          alignItems: "stretch",
          borderLeft: "1px solid var(--line)",
        }}
      >
        <PillButton
          onClick={onToggle}
          title={`${current.running ? "Pause" : "Start"} (${shortcutLabel("toggleTimerLocal")})`}
          color={idle ? "var(--ink-2)" : "var(--ink)"}
        >
          <PlayPauseIcon running={current.running} size={13} />
        </PillButton>
        <PillButton
          onClick={onBrainClick}
          title={`Brain dump (${shortcutLabel("brainDump")})`}
          background={dumpOpen ? "var(--accent)" : undefined}
          color={dumpOpen ? "var(--on-accent)" : "var(--ink-2)"}
        >
          <Ic.Brain s={13} />
        </PillButton>
        <PillButton
          onClick={onExpandClick}
          title={`${expandedVisible ? "Collapse" : "Expand"} window (${shortcutLabel("expandWindow")})`}
          color="var(--ink-2)"
        >
          <ChevronRotate
            open={expandedVisible}
            s={13}
            closedAngle={90}
            openAngle={-90}
          />
        </PillButton>
        <PillButton
          onClick={onQuitClick}
          title={`Quit Attensi (${shortcutLabel("quitApp")})`}
          color="var(--ink-3)"
        >
          <Ic.Close s={12} />
        </PillButton>
      </div>
    </div>
  );
}
