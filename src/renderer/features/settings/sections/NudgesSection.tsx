import type { NudgeSettings } from "@shared/types";
import { Toggle } from "../Toggle";
import { SectionHeading, SectionTitle } from "../Field";
import { WorkHoursEditor } from "./WorkHoursEditor";
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

      <SectionHeading>Work hours</SectionHeading>
      <div className="ink-3" style={{ fontSize: 11, marginBottom: 8 }}>
        Nudges only fire inside this window. Each day can have its own schedule,
        with up to three ranges (handy for a lunch break).
      </div>
      <WorkHoursEditor
        value={settings.workHours}
        onChange={(next) => void patchSettings({ workHours: next })}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 0",
          marginTop: 12,
          borderTop: "1px solid var(--line)",
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
            Match system Do Not Disturb
          </div>
          <div className="ink-3" style={{ fontSize: 11, marginTop: 2 }}>
            Also stay quiet whenever Windows Focus or macOS DND is on.
          </div>
        </div>
        <Toggle
          on={settings.respectSystemDnd}
          onChange={(v) => void patchSettings({ respectSystemDnd: v })}
        />
      </div>
    </>
  );
}
