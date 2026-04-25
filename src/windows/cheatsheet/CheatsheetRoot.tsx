import { useEffect } from 'react';
import { rpc } from '@/shared/api';
import { SHORTCUTS } from '@/shared/hotkeys';

const GROUPS: { title: string; rows: [keyof typeof SHORTCUTS, string][] }[] = [
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

export function CheatsheetRoot() {
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' || e.key === '?') {
        e.preventDefault();
        void rpc('window:close');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="attensi" style={{ height: '100%', padding: 6 }}>
      <div className="card" style={{ width: '100%', height: '100%', padding: '18px 22px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <div className="display" style={{ fontSize: 18, fontWeight: 500 }}>Keyboard shortcuts</div>
          <span className="kbd">?</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 28px' }}>
          {GROUPS.map((g) => (
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
                    <span className="mono" style={{ fontSize: 11, color: 'var(--ink-2)' }}>{win}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
