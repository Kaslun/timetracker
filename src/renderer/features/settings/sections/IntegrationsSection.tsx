import { useState } from "react";
import type { IntegrationState, IntegrationStatus } from "@shared/types";
import { SectionTitle } from "../Field";
import { ConnectDrawer } from "./ConnectDrawer";
import { useStore } from "@/store";
import { rpc } from "@/lib/api";

export function IntegrationsSection() {
  const integrations = useStore((s) => s.integrations);
  const [drawer, setDrawer] = useState<IntegrationState | null>(null);

  return (
    <>
      <SectionTitle
        title="Integrations"
        sub="Connect a tool to populate tasks, fill suggestions, and calendar entries."
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {integrations.map((s) => (
          <IntegrationRow
            key={s.id}
            state={s}
            onConnect={() => setDrawer(s)}
            onDisconnect={async () => {
              await rpc("integration:disconnect", { id: s.id });
            }}
          />
        ))}
      </div>

      {drawer ? (
        <ConnectDrawer
          initial={drawer}
          onClose={() => setDrawer(null)}
          onConnected={() => setDrawer(null)}
        />
      ) : null}
    </>
  );
}

interface RowProps {
  state: IntegrationState;
  onConnect: () => void;
  onDisconnect: () => void | Promise<void>;
}

function IntegrationRow({ state: s, onConnect, onDisconnect }: RowProps) {
  const isConnected = s.status === "connected";
  const isError = s.status === "error";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        border: `1.5px solid ${isConnected ? "var(--accent)" : isError ? "var(--danger)" : "var(--line)"}`,
        borderRadius: "var(--radius)",
        background: isConnected
          ? "color-mix(in oklab, var(--accent) 6%, var(--surface))"
          : "var(--surface)",
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
        <div className="mono ink-3" style={{ fontSize: 10, marginTop: 2 }}>
          {isConnected && s.account ? s.account : s.meta}
        </div>
      </div>
      <StatusChip status={s.status} message={s.errorMessage} />
      {isConnected ? (
        <button
          className="btn ghost"
          onClick={() => void onDisconnect()}
          style={{ fontSize: 11 }}
        >
          Disconnect
        </button>
      ) : (
        <button
          className="btn"
          onClick={onConnect}
          disabled={s.status === "connecting"}
          style={{ fontSize: 11 }}
        >
          {s.status === "connecting" ? "Connecting…" : "Connect"}
        </button>
      )}
    </div>
  );
}

function StatusChip({
  status,
  message,
}: {
  status: IntegrationStatus;
  message: string | null;
}) {
  if (status === "disconnected") {
    return (
      <span className="chip" title="Not connected">
        Not connected
      </span>
    );
  }
  if (status === "connecting") {
    return (
      <span className="chip" title="Connecting…">
        Connecting…
      </span>
    );
  }
  if (status === "error") {
    return (
      <span
        className="chip"
        title={message ?? "Connection error"}
        style={{
          color: "var(--danger)",
          borderColor: "var(--danger)",
          background: "color-mix(in oklab, var(--danger) 10%, transparent)",
        }}
      >
        Error
      </span>
    );
  }
  return (
    <span
      className="chip"
      style={{
        color: "var(--ok)",
        borderColor: "var(--ok)",
        background: "color-mix(in oklab, var(--ok) 10%, transparent)",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: "var(--ok)",
        }}
      />
      Connected
    </span>
  );
}
