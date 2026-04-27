import { useState } from "react";
import type { IntegrationState } from "@shared/types";
import { ConnectDrawer } from "../settings/sections/ConnectDrawer";
import { ServiceTile } from "./ServiceTile";
import { useStore } from "@/store";

export function ToolsStep() {
  const integrations = useStore((s) => s.integrations);
  const [drawer, setDrawer] = useState<IntegrationState | null>(null);
  const count = integrations.filter((s) => s.status === "connected").length;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          marginBottom: 4,
        }}
      >
        <span
          className="mono"
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "var(--accent)",
            letterSpacing: "0.1em",
          }}
        >
          02
        </span>
        <div
          style={{ fontSize: 14, fontWeight: 500, letterSpacing: "-0.005em" }}
        >
          Link your tools
        </div>
        <span style={{ flex: 1 }} />
        <span className="mono ink-3" style={{ fontSize: 10 }}>
          {count} connected
        </span>
      </div>
      <div className="ink-3" style={{ fontSize: 11, marginBottom: 12 }}>
        We'll pull context so you can log in a click. Skip — add later anytime.
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 20,
        }}
      >
        {integrations.map((s) => (
          <ServiceTile key={s.id} state={s} onClick={() => setDrawer(s)} />
        ))}
      </div>

      {drawer ? (
        <ConnectDrawer
          initial={drawer}
          onClose={() => setDrawer(null)}
          onConnected={() => setDrawer(null)}
        />
      ) : null}
    </div>
  );
}
