import { useEffect, useRef, useState } from 'react';
import { rpc } from '@/shared/api';
import { Ic } from '@/shared/primitives';
import { SERVICES, type ServiceMeta } from '@/shared/services';

export function IntroRoot() {
  const [name, setName] = useState('');
  const [connected, setConnected] = useState<Record<string, boolean>>({ linear: true, slack: true });
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const connectedCount = Object.values(connected).filter(Boolean).length;
  const toggle = (id: string): void => setConnected((c) => ({ ...c, [id]: !c[id] }));

  const onDone = async (): Promise<void> => {
    if (!name) return;
    await rpc('window:closeIntro', { name, connected });
  };

  const onSkip = async (): Promise<void> => {
    await rpc('window:closeIntro', undefined);
  };

  return (
    <div
      className="attensi"
      style={{
        height: '100%',
        background: 'color-mix(in oklab, var(--ink) 35%, transparent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
      }}
    >
      <div
        className="window"
        style={{
          width: '100%',
          height: '100%',
          maxWidth: 520,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => void onSkip()}
            className="btn ghost icon"
            style={{ position: 'absolute', top: 10, right: 10, zIndex: 2 }}
            title="Skip for now"
          >
            <Ic.Close s={12} />
          </button>
        </div>

        <div className="scroll" style={{ flex: 1, padding: '30px 32px 0', overflow: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              ◴
            </div>
            <span
              className="mono"
              style={{
                fontSize: 11,
                color: 'var(--ink-3)',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              Attensi
            </span>
          </div>

          <div
            className="display"
            style={{
              fontSize: 32,
              fontWeight: 500,
              lineHeight: 1.08,
              letterSpacing: '-0.02em',
              marginBottom: 8,
            }}
          >
            Let's make time tracking
            <br />
            actually painless.
          </div>
          <div className="ink-3" style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 24 }}>
            Two quick things and you're set. You can change everything later in Settings.
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: 'var(--accent)',
                  letterSpacing: '0.1em',
                }}
              >
                01
              </span>
              <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.005em' }}>
                What should we call you?
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                border: `1.5px solid ${name ? 'var(--accent)' : 'var(--line-2)'}`,
                borderRadius: 'var(--radius)',
                padding: '10px 14px',
                background: 'var(--surface)',
                transition: 'border-color 0.15s',
              }}
            >
              <span className="ink-3" style={{ fontSize: 15, marginRight: 8 }}>Hi,</span>
              <input
                ref={nameRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && name) void onDone();
                }}
                placeholder="Marta"
                className="input"
                style={{
                  flex: 1,
                  fontSize: 15,
                  fontWeight: 500,
                  fontFamily: 'var(--font-ui)',
                  letterSpacing: '-0.01em',
                  background: 'transparent',
                  border: 0,
                }}
              />
              {name && (
                <span className="mono" style={{ fontSize: 11, color: 'var(--accent)', marginLeft: 8 }}>
                  <Ic.Check s={12} />
                </span>
              )}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: 'var(--accent)',
                  letterSpacing: '0.1em',
                }}
              >
                02
              </span>
              <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.005em' }}>
                Link your tools
              </div>
              <span style={{ flex: 1 }} />
              <span className="mono ink-3" style={{ fontSize: 10 }}>
                {connectedCount} selected
              </span>
            </div>
            <div className="ink-3" style={{ fontSize: 11, marginBottom: 12 }}>
              We'll pull context so you can log in a click. Skip — add later anytime.
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                marginBottom: 20,
              }}
            >
              {SERVICES.map((s) => (
                <ServiceTile
                  key={s.id}
                  s={s}
                  connected={!!connected[s.id]}
                  onToggle={() => toggle(s.id)}
                />
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '14px 32px',
            borderTop: '1px solid var(--line)',
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            background: 'var(--bg-2)',
          }}
        >
          <div className="ink-3" style={{ fontSize: 11, flex: 1 }}>
            Takes <span style={{ fontWeight: 600, color: 'var(--ink-2)' }}>&lt; 30 sec</span> · nothing is logged yet
          </div>
          <button className="btn ghost" onClick={() => void onSkip()}>
            Skip for now
          </button>
          <button
            className="btn accent"
            disabled={!name}
            onClick={() => void onDone()}
            style={{
              opacity: name ? 1 : 0.5,
              cursor: name ? 'pointer' : 'not-allowed',
              padding: '8px 16px',
            }}
          >
            Get started
            <span style={{ marginLeft: 4 }}>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ServiceTile({
  s,
  connected,
  onToggle,
}: {
  s: ServiceMeta;
  connected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        border: `1.5px solid ${connected ? 'var(--accent)' : 'var(--line)'}`,
        borderRadius: 'var(--radius)',
        background: connected
          ? 'color-mix(in oklab, var(--accent) 6%, var(--surface))'
          : 'var(--surface)',
        cursor: 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
        position: 'relative',
        textAlign: 'left',
        color: 'var(--ink)',
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
        <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: '-0.005em' }}>{s.label}</div>
        <div className="mono ink-3" style={{ fontSize: 10, marginTop: 1 }}>{s.meta}</div>
      </div>
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          border: `1.5px solid ${connected ? 'var(--accent)' : 'var(--ink-4)'}`,
          background: connected ? 'var(--accent)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          flexShrink: 0,
        }}
      >
        {connected && <Ic.Check s={10} />}
      </div>
    </button>
  );
}
