import type { ReactNode } from "react";
import { Ic } from "./Icons";

interface TitleBarProps {
  title: string;
  right?: ReactNode;
  draggable?: boolean;
  onClose?: () => void;
  onMinimize?: () => void;
}

export function TitleBar({
  title,
  right,
  draggable = true,
  onClose,
  onMinimize,
}: TitleBarProps) {
  return (
    <div
      className={draggable ? "drag" : ""}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div className="tl">
        <span
          onClick={onClose}
          role={onClose ? "button" : undefined}
          style={onClose ? { cursor: "pointer" } : undefined}
        />
        <span
          onClick={onMinimize}
          role={onMinimize ? "button" : undefined}
          style={onMinimize ? { cursor: "pointer" } : undefined}
        />
        <span />
      </div>
      <div
        style={{
          flex: 1,
          textAlign: "center",
          fontSize: 12,
          color: "var(--ink-3)",
          letterSpacing: "-0.005em",
        }}
      >
        {title}
      </div>
      <div
        className="no-drag"
        style={{ display: "flex", gap: 4, alignItems: "center" }}
      >
        {right ?? <span style={{ width: 33 }} />}
      </div>
    </div>
  );
}

// re-export so default kbd-style helpers may use Ic if needed
void Ic;
