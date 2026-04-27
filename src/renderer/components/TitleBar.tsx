import type { ReactNode, CSSProperties } from "react";
import { rpc } from "@/lib/api";

interface TitleBarProps {
  title: string;
  /** Custom widgets rendered on the left next to the title (e.g. running-task chip). */
  left?: ReactNode;
  /** Custom action buttons rendered before the system controls. */
  right?: ReactNode;
  draggable?: boolean;
  /** Hide the system controls (close/min/max). Used for chromeless surfaces. */
  hideSystemControls?: boolean;
  /** Override the close handler — defaults to closing the focused window. */
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

/**
 * Windows-style frameless title bar.
 *
 * Controls (minimize ─ / maximize □ / close ✕) sit flush in the top-right
 * corner with no gap, theme-aware monochrome glyphs, and a red hover state
 * on close. `--ink-2` default → `--ink-1` on hover, `--danger` background on
 * the close button only.
 */
export function TitleBar({
  title,
  left,
  right,
  draggable = true,
  hideSystemControls = false,
  onClose,
  onMinimize,
  onMaximize,
}: TitleBarProps) {
  const close = onClose ?? (() => void rpc("window:close"));
  const minimize = onMinimize ?? (() => void rpc("window:minimizeFocused"));
  const maximize = onMaximize ?? (() => void rpc("window:maximizeFocused"));

  return (
    <div
      className={draggable ? "drag" : ""}
      style={{
        display: "flex",
        alignItems: "stretch",
        height: 36,
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 14px",
          flex: 1,
          minWidth: 0,
        }}
      >
        {left}
        <div
          style={{
            fontSize: 12,
            color: "var(--ink-3)",
            letterSpacing: "-0.005em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            flex: 1,
          }}
        >
          {title}
        </div>
        {right ? (
          <div
            className="no-drag"
            style={{ display: "flex", gap: 4, alignItems: "center" }}
          >
            {right}
          </div>
        ) : null}
      </div>
      {!hideSystemControls ? (
        <div
          className="no-drag"
          style={{ display: "flex", height: "100%", flexShrink: 0 }}
        >
          <SystemControl kind="minimize" title="Minimize" onClick={minimize} />
          <SystemControl
            kind="maximize"
            title="Maximize / restore"
            onClick={maximize}
          />
          <SystemControl kind="close" title="Close" onClick={close} />
        </div>
      ) : null}
    </div>
  );
}

const CONTROL_BASE: CSSProperties = {
  width: 46,
  height: 32,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
  border: 0,
  padding: 0,
  cursor: "pointer",
  color: "var(--ink-2)",
  flexShrink: 0,
};

function SystemControl({
  kind,
  title,
  onClick,
}: {
  kind: "minimize" | "maximize" | "close";
  title: string;
  onClick: () => void;
}) {
  const isClose = kind === "close";
  return (
    <button
      className="titlebar-ctl"
      data-kind={kind}
      title={title}
      onClick={onClick}
      style={CONTROL_BASE}
    >
      <span
        style={{
          // Override on hover via CSS class — we want full-width red on close
          // hover, neutral surface fill on the others.
          pointerEvents: "none",
          display: "inline-flex",
        }}
      >
        {kind === "minimize" ? <MinIcon /> : null}
        {kind === "maximize" ? <MaxIcon /> : null}
        {isClose ? <CloseIcon /> : null}
      </span>
    </button>
  );
}

function MinIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <line
        x1="0"
        y1="5"
        x2="10"
        y2="5"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}

function MaxIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <rect
        x="0.5"
        y="0.5"
        width="9"
        height="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M0 0 L10 10 M10 0 L0 10" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
