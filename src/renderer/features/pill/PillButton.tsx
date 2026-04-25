import type { ReactNode } from "react";

const BTN_W = 36;

export interface PillButtonProps {
  onClick: () => void;
  title: string;
  background?: string;
  color: string;
  children: ReactNode;
}

export function PillButton({
  onClick,
  title,
  background,
  color,
  children,
}: PillButtonProps) {
  return (
    <button
      className="btn ghost"
      onClick={onClick}
      title={title}
      style={{
        borderRadius: 0,
        height: "auto",
        width: BTN_W,
        alignSelf: "stretch",
        flexShrink: 0,
        background: background ?? "transparent",
        color,
        padding: 0,
        borderRight: "1px solid var(--line)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </button>
  );
}
