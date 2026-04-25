import type { ThemeMeta } from '@/shared/themes';
import { Ic } from '@/shared/primitives';

interface ThemeSwatchProps {
  theme: ThemeMeta;
  active: boolean;
  onClick: () => void;
}

export function ThemeSwatch({ theme, active, onClick }: ThemeSwatchProps) {
  return (
    <button
      onClick={onClick}
      style={{
        cursor: 'pointer',
        borderRadius: 'var(--radius)',
        border: `2px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
        overflow: 'hidden',
        transition: 'border-color 0.15s',
        boxShadow: active ? '0 0 0 3px color-mix(in oklab, var(--accent) 25%, transparent)' : 'none',
        background: 'transparent',
        padding: 0,
        textAlign: 'left',
      }}
    >
      <div
        style={{
          background: theme.bg,
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: theme.surface,
            borderRadius: 6,
            padding: '5px 8px',
            border: `1px solid ${theme.bg === '#0d0f12' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
          }}
        >
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              background: theme.accent,
              opacity: 0.18,
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ height: 5, width: '70%', borderRadius: 2, background: theme.ink, opacity: 0.5 }} />
            <div style={{ height: 4, width: '40%', borderRadius: 2, background: theme.accent, opacity: 0.7 }} />
          </div>
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: theme.accent,
              opacity: 0.9,
              flexShrink: 0,
            }}
          />
        </div>
        <div style={{ height: 3, background: theme.ink, opacity: 0.07, borderRadius: 2, width: '100%' }} />
        <div style={{ height: 3, background: theme.accent, opacity: 0.6, borderRadius: 2, width: '55%' }} />
      </div>
      <div
        style={{
          background: theme.surface,
          padding: '8px 12px',
          borderTop: `1px solid ${
            theme.bg === '#0d0f12' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'
          }`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: theme.ink,
              fontFamily: 'var(--font-ui)',
            }}
          >
            {theme.label}
          </div>
          <div
            style={{
              fontSize: 10,
              color: theme.ink,
              opacity: 0.5,
              fontFamily: 'var(--font-mono)',
              marginTop: 1,
            }}
          >
            {theme.font}
          </div>
        </div>
        {active && (
          <span
            style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: theme.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <Ic.Check s={9} />
          </span>
        )}
      </div>
    </button>
  );
}
