import { useStore } from "@/store";
import { rpc } from "@/lib/api";
import { Toggle } from "../Toggle";
import { Field, NumberInput, SectionTitle } from "../Field";

export function GeneralSection() {
  const settings = useStore((s) => s.settings);
  const patchSettings = useStore((s) => s.patchSettings);

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
    </>
  );
}
