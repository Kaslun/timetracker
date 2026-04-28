import { useEffect, useState } from "react";
import { Toggle } from "../Toggle";
import { Field, NumberInput, SectionHeading, SectionTitle } from "../Field";
import { useStore } from "@/store";
import { DEFAULT_TAB_ORDER } from "@/features/expanded/tabOrder";
import { on, rpc } from "@/lib/api";

interface UpdateInfo {
  current: string;
  latest: string | null;
  hasUpdate: boolean;
  url: string | null;
  installerUrl: string | null;
  notes: string | null;
  checkedAt: number;
  error: string | null;
  canAutoInstall: boolean;
  downloadProgress: number | null;
  downloaded: boolean;
}

export function GeneralSection() {
  const settings = useStore((s) => s.settings);
  const patchSettings = useStore((s) => s.patchSettings);
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const onWipe = async (): Promise<void> => {
    const ok = window.confirm(
      "This deletes all tasks, projects, time entries, captures, and settings. Integrations stay connected. Continue?",
    );
    if (!ok) return;
    setWiping(true);
    try {
      await rpc("app:wipeLocalData");
      // The main process will relaunch us in ~250ms — leave the spinner up.
    } catch (err) {
      setWiping(false);
      window.alert(
        `Wipe failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const onDisconnect = async (): Promise<void> => {
    const ok = window.confirm(
      "Disconnect every integration and clear their saved tokens? You'll need to re-authenticate to import data again.",
    );
    if (!ok) return;
    setDisconnecting(true);
    try {
      await rpc("app:disconnectAllIntegrations");
    } finally {
      setDisconnecting(false);
    }
  };

  const onResetTabOrder = (): void => {
    void patchSettings({ expandedTabOrder: [...DEFAULT_TAB_ORDER] });
  };

  // Subscribe to download progress so the button reflects current state.
  useEffect(() => on("update:state", (u) => setUpdate(u)), []);

  const onCheck = async (): Promise<void> => {
    setChecking(true);
    const u = await rpc("update:check");
    setUpdate(u);
    setChecking(false);
  };

  const onUpdate = (): void => {
    if (update?.canAutoInstall) void rpc("update:install");
    else void rpc("update:open");
  };

  const isDownloading =
    update?.downloadProgress !== null &&
    update?.downloadProgress !== undefined &&
    !update?.downloaded;
  const updateLabel = isDownloading
    ? `Downloading… ${Math.round((update?.downloadProgress ?? 0) * 100)}%`
    : update?.canAutoInstall
      ? "Update"
      : "Open release";

  return (
    <>
      <SectionTitle
        title="General"
        sub="Account, startup, basic preferences."
      />
      <Field
        label="Display name"
        sub="Used to greet you in the intro and toasts."
      >
        <input
          className="input"
          defaultValue={settings.userName ?? ""}
          onBlur={(e) =>
            void patchSettings({ userName: e.target.value || null })
          }
          placeholder="Your name"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            borderRadius: 6,
            padding: "6px 10px",
            fontSize: 13,
          }}
        />
      </Field>
      <Field
        label="Open at login"
        sub="Start the pill quietly when Windows boots."
        inline
      >
        <Toggle
          on={settings.autoLaunch}
          onChange={(v) => void rpc("autoLaunch:set", { enabled: v })}
        />
      </Field>
      <Field
        label="Pill always visible"
        sub="Hide pill via the tray menu when needed."
        inline
      >
        <Toggle
          on={settings.pillVisible}
          onChange={(v) => {
            if (v) void rpc("window:showPill");
            else void rpc("window:hidePill");
          }}
        />
      </Field>
      <Field
        label="Idle threshold"
        sub="Trigger an idle-recovery prompt after N minutes of keyboard silence."
        inline
      >
        <NumberInput
          value={settings.idleThresholdMinutes}
          onChange={(v) => void patchSettings({ idleThresholdMinutes: v })}
          suffix="min"
        />
      </Field>
      <Field
        label="Retroactive fill threshold"
        sub="Surface a 'fill the gap' card when an unlogged window is at least N minutes."
        inline
      >
        <NumberInput
          value={settings.fillGapMinutes}
          onChange={(v) => void patchSettings({ fillGapMinutes: v })}
          suffix="min"
        />
      </Field>

      <SectionHeading>Updates</SectionHeading>
      <Field
        label="Check for a newer version"
        sub={
          update
            ? update.error
              ? `Last check failed: ${update.error}`
              : update.hasUpdate
                ? `Latest is ${update.latest} — you have ${update.current}.`
                : `You're on the latest (${update.current}).`
            : "Looks for a newer release on GitHub."
        }
        inline
      >
        <div style={{ display: "flex", gap: 6 }}>
          <button
            className="btn"
            onClick={() => void onCheck()}
            disabled={checking || isDownloading}
          >
            {checking ? "Checking…" : "Check now"}
          </button>
          {update?.hasUpdate ? (
            <button
              className="btn accent"
              onClick={onUpdate}
              disabled={isDownloading}
            >
              {updateLabel}
            </button>
          ) : null}
        </div>
      </Field>

      <SectionHeading>Tabs</SectionHeading>
      <Field
        label="Reset tab order"
        sub="Restore the expanded window's tabs to Timeline · Tasks · Inbox · Fill gaps · Projects."
        inline
      >
        <button className="btn" onClick={onResetTabOrder}>
          Reset
        </button>
      </Field>

      <SectionHeading>Danger zone</SectionHeading>
      <Field
        label="Wipe local data"
        sub="Removes every task, project, time entry, capture, custom tag, and most settings. Connected integrations and their keychain tokens are kept so you don't have to re-authenticate."
        inline
      >
        <button
          className="btn danger"
          onClick={() => void onWipe()}
          disabled={wiping}
        >
          {wiping ? "Wiping…" : "Wipe local data"}
        </button>
      </Field>
      <Field
        label="Disconnect all integrations"
        sub="Burns every keychain token and forgets every linked workspace. Local data is untouched. Use this if a token leaked or you're handing the laptop on."
        inline
      >
        <button
          className="btn danger"
          onClick={() => void onDisconnect()}
          disabled={disconnecting}
        >
          {disconnecting ? "Disconnecting…" : "Disconnect everything"}
        </button>
      </Field>
    </>
  );
}
