import { useState } from "react";
import type {
  IntegrationConfig,
  IntegrationState,
  IntegrationStatus,
} from "@shared/types";
import { INTEGRATION_META } from "@shared/integrations/registry";
import {
  DEFAULT_INTEGRATION_CONFIG,
  DEFAULT_TEMPO_CONFIG,
} from "@shared/constants";
import { SectionTitle } from "../Field";
import { Toggle } from "../Toggle";
import { ConnectDrawer } from "./ConnectDrawer";
import { useStore } from "@/store";
import { rpc } from "@/lib/api";

export function IntegrationsSection() {
  const integrations = useStore((s) => s.integrations);
  const settings = useStore((s) => s.settings);
  const patchSettings = useStore((s) => s.patchSettings);
  const [drawer, setDrawer] = useState<IntegrationState | null>(null);

  const updateConfig = (
    id: string,
    patch: Partial<IntegrationConfig>,
  ): void => {
    const cur = settings.integrationConfigs[id] ?? {
      ...DEFAULT_INTEGRATION_CONFIG,
    };
    void patchSettings({
      integrationConfigs: {
        ...settings.integrationConfigs,
        [id]: { ...cur, ...patch },
      },
    });
  };

  const syncTempo = async (): Promise<void> => {
    await rpc("integration:tempoSync", { dryRun: false });
  };

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
            config={
              settings.integrationConfigs[s.id] ?? {
                ...DEFAULT_INTEGRATION_CONFIG,
              }
            }
            onConnect={() => setDrawer(s)}
            onDisconnect={async () => {
              await rpc("integration:disconnect", { id: s.id });
            }}
            onConfigChange={(patch) => updateConfig(s.id, patch)}
            onSyncTempo={syncTempo}
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
  config: IntegrationConfig;
  onConnect: () => void;
  onDisconnect: () => void | Promise<void>;
  onConfigChange: (patch: Partial<IntegrationConfig>) => void;
  onSyncTempo: () => void | Promise<void>;
}

function IntegrationRow({
  state: s,
  config,
  onConnect,
  onDisconnect,
  onConfigChange,
  onSyncTempo,
}: RowProps) {
  const isConnected = s.status === "connected";
  const isError = s.status === "error";
  const meta = INTEGRATION_META[s.id];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        padding: 0,
        border: `1.5px solid ${isConnected ? "var(--accent)" : isError ? "var(--danger)" : "var(--line)"}`,
        borderRadius: "var(--radius)",
        background: isConnected
          ? "color-mix(in oklab, var(--accent) 6%, var(--surface))"
          : "var(--surface)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 14px",
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
            style={{
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: "-0.005em",
            }}
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

      {isConnected ? (
        <div
          style={{
            padding: "10px 14px 12px",
            borderTop: "1px solid var(--line)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {meta.supportsAssigneeFilter ? (
            <ConfigToggle
              label="Only fetch tasks assigned to me"
              sub="Most reliable. Uses the provider's native assignee filter."
              on={config.assigneeOnly}
              onChange={(v) => onConfigChange({ assigneeOnly: v })}
            />
          ) : null}
          {meta.supportsAssigneeFilter ? (
            <ConfigToggle
              label="Include unassigned tasks I created"
              sub="Useful for personal boards where assignment is implicit."
              on={config.includeUnassignedICreated}
              disabled={!config.assigneeOnly}
              onChange={(v) => onConfigChange({ includeUnassignedICreated: v })}
            />
          ) : null}
          {s.id === "jira" ? (
            <TempoConfigBlock
              config={config.tempo ?? { ...DEFAULT_TEMPO_CONFIG }}
              onConfigChange={(patch) =>
                onConfigChange({
                  tempo: {
                    ...DEFAULT_TEMPO_CONFIG,
                    ...config.tempo,
                    ...patch,
                  },
                })
              }
              onSyncNow={onSyncTempo}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ConfigToggle({
  label,
  sub,
  on,
  disabled,
  onChange,
}: {
  label: string;
  sub: string;
  on: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 500 }}>{label}</div>
        <div className="ink-3" style={{ fontSize: 10, marginTop: 2 }}>
          {sub}
        </div>
      </div>
      <Toggle on={on} onChange={(v) => !disabled && onChange(v)} />
    </div>
  );
}

function TempoConfigBlock({
  config,
  onConfigChange,
  onSyncNow,
}: {
  config: NonNullable<IntegrationConfig["tempo"]>;
  onConfigChange: (
    patch: Partial<NonNullable<IntegrationConfig["tempo"]>>,
  ) => void;
  onSyncNow: () => void | Promise<void>;
}) {
  return (
    <div
      style={{
        marginTop: 4,
        paddingTop: 8,
        borderTop: "1px dashed var(--line)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        className="display"
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: "var(--ink-3)",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        Tempo timesheets
      </div>
      <ConfigToggle
        label={
          config.detected
            ? "Sync time entries to Tempo"
            : "Tempo not detected — sync time entries?"
        }
        sub={
          config.detected
            ? "Pushes timeline entries as Tempo worklogs every 5 minutes."
            : "Will probe again on next refresh. Enable to push anyway."
        }
        on={config.enabled}
        onChange={(v) => onConfigChange({ enabled: v })}
      />
      <ConfigToggle
        label="Dry-run mode"
        sub="Log what would sync, don't hit the API. Recommended for testing."
        on={config.dryRun}
        onChange={(v) => onConfigChange({ dryRun: v })}
        disabled={!config.enabled}
      />
      <button
        className="btn ghost"
        onClick={() => void onSyncNow()}
        disabled={!config.enabled}
        style={{ alignSelf: "flex-start", fontSize: 11 }}
      >
        Sync now
      </button>
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
