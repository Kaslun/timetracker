import type { IntegrationState } from "@shared/types";
import { Ic } from "@/components";

export interface ServiceTileProps {
  state: IntegrationState;
  onClick: () => void;
}

/**
 * Compact service tile rendered in the first-run "Link your tools" grid and
 * driven entirely by the live `IntegrationState` snapshot from the registry.
 *
 * Click → caller pops the same connect drawer used in Settings. Disconnected
 * tiles get the calm neutral border, connected tiles glow `--accent`, and an
 * error tile drops a small red dot — never an alarm bell, this is onboarding.
 */
export function ServiceTile({ state: s, onClick }: ServiceTileProps) {
  const connected = s.status === "connected";
  const isError = s.status === "error";
  const busy = s.status === "connecting";

  return (
    <button
      onClick={onClick}
      disabled={busy}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        border: `1.5px solid ${connected ? "var(--accent)" : isError ? "var(--danger)" : "var(--line)"}`,
        borderRadius: "var(--radius)",
        background: connected
          ? "color-mix(in oklab, var(--accent) 6%, var(--surface))"
          : "var(--surface)",
        cursor: busy ? "wait" : "pointer",
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
          {connected ? "Connected" : busy ? "Connecting…" : s.meta}
        </div>
      </div>
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: `1.5px solid ${connected ? "var(--accent)" : isError ? "var(--danger)" : "var(--ink-4)"}`,
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
