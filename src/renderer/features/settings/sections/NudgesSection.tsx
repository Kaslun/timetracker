import type { NudgeSettings } from "@shared/types";
import { Toggle } from "../Toggle";
import { SectionHeading, SectionTitle } from "../Field";
import { Ic } from "@/components";
import { useStore } from "@/store";

const NUDGE_ITEMS: ReadonlyArray<{
  key: keyof NudgeSettings;
  title: string;
  sub: string;
}> = [
  {
    key: "idleRecovery",
    title: "Idle recovery",
    sub: "Ask what happened after N+ min of keyboard silence",
  },
  {
    key: "retroactiveFill",
    title: "Retroactive fill",
    sub: "Suggest logs from apps when a 45+ min gap appears",
  },
  {
    key: "focusSprintCheckins",
    title: "Focus sprint check-ins",
    sub: "Celebrate sprint completions (quiet)",
  },
  {
    key: "hyperfocusAlerts",
    title: "Hyperfocus alerts",
    sub: "Flag when you have been in one task 3+ hours",
  },
  {
    key: "contextSwitchConfirm",
    title: "Context-switch confirm",
    sub: "Ask before auto-switching on app focus",
  },
];

export function NudgesSection() {
  const settings = useStore((s) => s.settings);
  const patchSettings = useStore((s) => s.patchSettings);

  const setNudge = (key: keyof NudgeSettings, value: boolean): void => {
    void patchSettings({ nudges: { ...settings.nudges, [key]: value } });
  };

  return (
    <>
      <SectionTitle
        title="Nudges"
        sub="Gentle by design. Turn anything off anytime."
      />
      {NUDGE_ITEMS.map((s) => (
        <div
          key={s.key}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 0",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: "-0.005em",
              }}
            >
              {s.title}
            </div>
            <div className="ink-3" style={{ fontSize: 11, marginTop: 2 }}>
              {s.sub}
            </div>
          </div>
          <Toggle
            on={settings.nudges[s.key]}
            onChange={(v) => setNudge(s.key, v)}
          />
        </div>
      ))}
      <SectionHeading>Quiet hours</SectionHeading>
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span className="chip">
          {settings.quietHours?.days.join(" · ") ?? "off"}
        </span>
        <span className="mono num" style={{ fontSize: 12 }}>
          {settings.quietHours?.from ?? "—"}
        </span>
        <span className="ink-3" style={{ fontSize: 11 }}>
          to
        </span>
        <span className="mono num" style={{ fontSize: 12 }}>
          {settings.quietHours?.to ?? "—"}
        </span>
        <span style={{ flex: 1 }} />
        <button
          className="btn ghost icon"
          onClick={() =>
            void patchSettings({
              quietHours: settings.quietHours
                ? null
                : {
                    days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
                    from: "18:00",
                    to: "09:00",
                  },
            })
          }
          title={
            settings.quietHours ? "Disable quiet hours" : "Enable quiet hours"
          }
        >
          {settings.quietHours ? <Ic.Close s={12} /> : <Ic.Plus s={12} />}
        </button>
      </div>
    </>
  );
}
