import { useState } from 'react';
import { useStore } from '@/shared/store';
import { rpc } from '@/shared/api';
import { Ic, TitleBar } from '@/shared/primitives';
import { THEMES } from '@/shared/themes';
import { ThemeSwatch } from './ThemeSwatch';
import { Toggle } from './Toggle';
import type { Density, NudgeSettings } from '@shared/models';
import { SHORTCUTS } from '@/shared/hotkeys';
import { SERVICES } from '@/shared/services';

const SECTIONS = [
  'General',
  'Appearance',
  'Nudges',
  'Focus sprints',
  'Integrations',
  'Shortcuts',
  'Data & export',
] as const;

type Section = typeof SECTIONS[number];

export function SettingsRoot() {
  const settings = useStore((s) => s.settings);
  const patchSettings = useStore((s) => s.patchSettings);
  const [section, setSection] = useState<Section>('Appearance');

  const setNudge = (key: keyof NudgeSettings, value: boolean): void => {
    void patchSettings({ nudges: { ...settings.nudges, [key]: value } });
  };

  const setDensity = (d: Density): void => {
    void patchSettings({ density: d });
  };

  const setIntegration = (id: string, on: boolean): void => {
    void patchSettings({ integrationsConnected: { ...settings.integrationsConnected, [id]: on } });
  };

  return (
    <div className="attensi window" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TitleBar title="Attensi · Settings" onClose={() => void rpc('window:close')} />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div
          style={{
            width: 160,
            borderRight: '1px solid var(--line)',
            padding: '10px 0',
            background: 'var(--bg)',
          }}
        >
          {SECTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setSection(s)}
              style={{
                display: 'block',
                width: '100%',
                padding: '7px 16px',
                fontSize: 12,
                fontWeight: section === s ? 600 : 400,
                background: section === s ? 'var(--surface)' : 'transparent',
                borderLeft: section === s ? '2px solid var(--accent)' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'background 0.1s',
                textAlign: 'left',
                color: 'var(--ink)',
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="scroll" style={{ flex: 1, padding: '16px 20px', overflow: 'auto' }}>
          {section === 'General' && (
            <>
              <div className="display" style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.01em' }}>
                General
              </div>
              <div className="ink-3" style={{ fontSize: 11, marginTop: 2, marginBottom: 16 }}>
                Account, startup, basic preferences.
              </div>
              <Field label="Display name" sub="Used to greet you in the intro and toasts.">
                <input
                  className="input"
                  defaultValue={settings.userName ?? ''}
                  onBlur={(e) => void patchSettings({ userName: e.target.value || null })}
                  placeholder="Your name"
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--line)',
                    borderRadius: 6,
                    padding: '6px 10px',
                    fontSize: 13,
                  }}
                />
              </Field>
              <Field label="Open at login" sub="Start the pill quietly when Windows boots." inline>
                <Toggle
                  on={settings.autoLaunch}
                  onChange={(v) => void rpc('autoLaunch:set', { enabled: v })}
                />
              </Field>
              <Field label="Pill always visible" sub="Hide pill via the tray menu when needed." inline>
                <Toggle
                  on={settings.pillVisible}
                  onChange={(v) => {
                    if (v) void rpc('window:showPill');
                    else void rpc('window:hidePill');
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
          )}

          {section === 'Appearance' && (
            <>
              <div className="display" style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.01em' }}>
                Appearance
              </div>
              <div className="ink-3" style={{ fontSize: 11, marginTop: 2, marginBottom: 16 }}>
                Colours, fonts and density. Synced across all windows.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {(['Light', 'Dark'] as const).map((group) => (
                  <div key={group}>
                    <div
                      className="display"
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: 'var(--ink-3)',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        marginBottom: 8,
                      }}
                    >
                      {group}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {THEMES.filter((t) => t.group === group).map((th) => (
                        <ThemeSwatch
                          key={th.id}
                          theme={th}
                          active={settings.theme === th.id}
                          onClick={() => void patchSettings({ theme: th.id })}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 20 }}>
                <SectionHeading>Density</SectionHeading>
                {(['compact', 'regular', 'comfy'] as const).map((d) => {
                  const labels: Record<Density, { label: string; sub: string }> = {
                    compact: { label: 'Compact', sub: 'More info, less breathing room' },
                    regular: { label: 'Regular', sub: 'Balanced — default' },
                    comfy:   { label: 'Comfy',   sub: 'Larger targets, more whitespace' },
                  };
                  const meta = labels[d];
                  const sel = settings.density === d;
                  return (
                    <button
                      key={d}
                      onClick={() => setDensity(d)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 0',
                        borderBottom: '1px solid var(--line)',
                        width: '100%',
                        background: 'transparent',
                        border: 0,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          border: `2px solid ${sel ? 'var(--accent)' : 'var(--ink-4)'}`,
                          background: sel ? 'var(--accent)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {sel && (
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />
                        )}
                      </span>
                      <div style={{ flex: 1, color: 'var(--ink)' }}>
                        <div style={{ fontSize: 13, fontWeight: sel ? 500 : 400 }}>{meta.label}</div>
                        <div className="ink-3" style={{ fontSize: 11, marginTop: 1 }}>{meta.sub}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {section === 'Nudges' && (
            <>
              <div className="display" style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.01em' }}>
                Nudges
              </div>
              <div className="ink-3" style={{ fontSize: 11, marginTop: 2, marginBottom: 16 }}>
                Gentle by design. Turn anything off anytime.
              </div>
              {([
                { key: 'idleRecovery',         title: 'Idle recovery',         sub: 'Ask what happened after N+ min of keyboard silence' },
                { key: 'retroactiveFill',      title: 'Retroactive fill',      sub: 'Suggest logs from apps when a 45+ min gap appears' },
                { key: 'focusSprintCheckins',  title: 'Focus sprint check-ins', sub: 'Celebrate sprint completions (quiet)' },
                { key: 'hyperfocusAlerts',     title: 'Hyperfocus alerts',     sub: 'Flag when you have been in one task 3+ hours' },
                { key: 'contextSwitchConfirm', title: 'Context-switch confirm', sub: 'Ask before auto-switching on app focus' },
              ] as const).map((s) => (
                <div
                  key={s.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 0',
                    borderBottom: '1px solid var(--line)',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: '-0.005em' }}>{s.title}</div>
                    <div className="ink-3" style={{ fontSize: 11, marginTop: 2 }}>{s.sub}</div>
                  </div>
                  <Toggle on={settings.nudges[s.key]} onChange={(v) => setNudge(s.key, v)} />
                </div>
              ))}
              <SectionHeading>Quiet hours</SectionHeading>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="chip">{settings.quietHours?.days.join(' · ') ?? 'off'}</span>
                <span className="mono num" style={{ fontSize: 12 }}>{settings.quietHours?.from ?? '—'}</span>
                <span className="ink-3" style={{ fontSize: 11 }}>to</span>
                <span className="mono num" style={{ fontSize: 12 }}>{settings.quietHours?.to ?? '—'}</span>
                <span style={{ flex: 1 }} />
                <button
                  className="btn ghost icon"
                  onClick={() =>
                    void patchSettings({
                      quietHours: settings.quietHours
                        ? null
                        : { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], from: '18:00', to: '09:00' },
                    })
                  }
                  title={settings.quietHours ? 'Disable quiet hours' : 'Enable quiet hours'}
                >
                  {settings.quietHours ? <Ic.Close s={12} /> : <Ic.Plus s={12} />}
                </button>
              </div>
            </>
          )}

          {section === 'Integrations' && (
            <>
              <div className="display" style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.01em' }}>
                Integrations
              </div>
              <div className="ink-3" style={{ fontSize: 11, marginTop: 2, marginBottom: 16 }}>
                v1 ships with friendly mocks — connections persist but don't call live APIs yet.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {SERVICES.map((s) => {
                  const on = !!settings.integrationsConnected[s.id];
                  return (
                    <div
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 12px',
                        border: `1.5px solid ${on ? 'var(--accent)' : 'var(--line)'}`,
                        borderRadius: 'var(--radius)',
                        background: on ? 'color-mix(in oklab, var(--accent) 6%, var(--surface))' : 'var(--surface)',
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: s.bg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: 14,
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          flexShrink: 0,
                        }}
                      >
                        {s.letter}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: '-0.005em' }}>
                          {s.label}
                        </div>
                        <div className="mono ink-3" style={{ fontSize: 10, marginTop: 1 }}>
                          {s.meta}
                        </div>
                      </div>
                      {on && <span className="chip">Demo</span>}
                      <Toggle on={on} onChange={(v) => setIntegration(s.id, v)} />
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {section === 'Shortcuts' && (
            <>
              <div className="display" style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.01em' }}>
                Shortcuts
              </div>
              <div className="ink-3" style={{ fontSize: 11, marginTop: 2, marginBottom: 16 }}>
                Global shortcuts work even when the app is hidden.
              </div>
              <ShortcutsTable />
            </>
          )}

          {section === 'Focus sprints' && (
            <>
              <div className="display" style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.01em' }}>
                Focus sprints
              </div>
              <div className="ink-3" style={{ fontSize: 11, marginTop: 2 }}>
                Coming soon — currently the focus ring shows your day-target progress.
              </div>
            </>
          )}

          {section === 'Data & export' && <DataAndExport />}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  sub,
  children,
  inline = false,
}: {
  label: string;
  sub?: string;
  children: React.ReactNode;
  inline?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: inline ? 'row' : 'column',
        alignItems: inline ? 'center' : 'stretch',
        gap: inline ? 12 : 6,
        padding: '12px 0',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div style={{ flex: inline ? 1 : undefined }}>
        <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: '-0.005em' }}>{label}</div>
        {sub && <div className="ink-3" style={{ fontSize: 11, marginTop: 2 }}>{sub}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function NumberInput({ value, onChange, suffix }: { value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        style={{
          width: 60,
          background: 'var(--surface-2)',
          border: '1px solid var(--line)',
          borderRadius: 6,
          padding: '4px 6px',
          fontSize: 13,
          color: 'var(--ink)',
        }}
      />
      {suffix && <span className="mono ink-3" style={{ fontSize: 11 }}>{suffix}</span>}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="display"
      style={{
        fontSize: 14,
        fontWeight: 600,
        marginTop: 20,
        marginBottom: 8,
        color: 'var(--ink-2)',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </div>
  );
}

function ShortcutsTable() {
  const groups: { title: string; rows: [keyof typeof SHORTCUTS, string][] }[] = [
    { title: 'Timer', rows: [
      ['toggleTimer', 'Start / pause'],
      ['switchTask', 'Switch task'],
      ['expandPill', 'Expand / collapse pill'],
    ]},
    { title: 'Capture', rows: [
      ['brainDump', 'Brain dump (anywhere)'],
      ['tagLastCapture', 'Tag last capture'],
      ['dismiss', 'Dismiss / save'],
    ]},
    { title: 'Navigate', rows: [
      ['taskSearch', 'Task search'],
      ['fillGaps', 'Fill gaps'],
      ['hidePill', 'Hide pill'],
    ]},
    { title: 'Focus', rows: [
      ['focusSprint', 'Start sprint'],
      ['bodyDoubling', 'Body-doubling'],
      ['cheatsheet', 'Show this sheet'],
    ]},
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 28px' }}>
      {groups.map((g) => (
        <div key={g.title}>
          <div
            className="display"
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
              marginBottom: 8,
            }}
          >
            {g.title}
          </div>
          {g.rows.map(([key, label]) => {
            const win = SHORTCUTS[key].win;
            return (
              <div
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 0',
                  borderBottom: '1px solid var(--line)',
                }}
              >
                <span style={{ fontSize: 12, flex: 1 }}>{label}</span>
                <span className="mono kbd" style={{ fontSize: 11, color: 'var(--ink-2)' }}>{win}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function DataAndExport() {
  return (
    <>
      <div className="display" style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.01em' }}>
        Data & export
      </div>
      <div className="ink-3" style={{ fontSize: 11, marginTop: 2, marginBottom: 16 }}>
        Everything lives locally in a single SQLite file.
      </div>
      <Field label="Database location" sub="%APPDATA%\Attensi Time Tracker\timetracker.sqlite">
        <span className="mono ink-3" style={{ fontSize: 11 }}>read-only — view in your file manager</span>
      </Field>
      <Field label="CSV export" sub="Use the Dashboard window for full export controls.">
        <button className="btn" onClick={() => void rpc('window:openDashboard')}>Open dashboard</button>
      </Field>
    </>
  );
}
