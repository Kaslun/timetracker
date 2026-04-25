import { Ic } from "@/components";
import type { ServiceMeta } from "@/lib/integrations";

export interface ServiceTileProps {
  s: ServiceMeta;
  connected: boolean;
  onToggle: () => void;
}

export function ServiceTile({ s, connected, onToggle }: ServiceTileProps) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        border: `1.5px solid ${connected ? "var(--accent)" : "var(--line)"}`,
        borderRadius: "var(--radius)",
        background: connected
          ? "color-mix(in oklab, var(--accent) 6%, var(--surface))"
          : "var(--surface)",
        cursor: "pointer",
        transition: "border-color 0.15s, background 0.15s",
        position: "relative",
        textAlign: "left",
        color: "var(--ink)",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: s.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: 14,
          fontWeight: 700,
          fontFamily: "var(--font-mono)",
          flexShrink: 0,
        }}
      >
        {s.letter}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{ fontSize: 13, fontWeight: 500, letterSpacing: "-0.005em" }}
        >
          {s.label}
        </div>
        <div className="mono ink-3" style={{ fontSize: 10, marginTop: 1 }}>
          {s.meta}
        </div>
      </div>
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: `1.5px solid ${connected ? "var(--accent)" : "var(--ink-4)"}`,
          background: connected ? "var(--accent)" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          flexShrink: 0,
        }}
      >
        {connected && <Ic.Check s={10} />}
      </div>
    </button>
  );
}
