import { Ic } from '@/shared/primitives';

export type TabId = 'timeline' | 'list' | 'inbox' | 'fill';

interface Tab {
  id: TabId;
  label: string;
  badge?: number;
}

interface TabsProps {
  active: TabId;
  onTab: (id: TabId) => void;
  inboxCount: number;
  fillCount: number;
  onDump: () => void;
}

export function Tabs({ active, onTab, inboxCount, fillCount, onDump }: TabsProps) {
  const tabs: Tab[] = [
    { id: 'timeline', label: 'Timeline' },
    { id: 'list',     label: 'Tasks' },
    { id: 'inbox',    label: 'Inbox',     badge: inboxCount > 0 ? inboxCount : undefined },
    { id: 'fill',     label: 'Fill gaps', badge: fillCount  > 0 ? fillCount  : undefined },
  ];
  return (
    <div
      style={{
        display: 'flex',
        gap: 0,
        padding: '0 12px',
        borderBottom: '1px solid var(--line)',
      }}
    >
      {tabs.map((tb) => {
        const isActive = tb.id === active;
        return (
          <button
            key={tb.id}
            onClick={() => onTab(tb.id)}
            style={{
              padding: '10px 12px',
              border: 'none',
              background: 'transparent',
              fontFamily: 'var(--font-ui)',
              fontSize: 12,
              fontWeight: isActive ? 600 : 500,
              cursor: 'pointer',
              color: isActive ? 'var(--ink)' : 'var(--ink-3)',
              borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              letterSpacing: '-0.005em',
            }}
          >
            {tb.label}
            {tb.badge ? (
              <span
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: 9,
                  fontWeight: 600,
                  padding: '1px 5px',
                  borderRadius: 8,
                }}
              >
                {tb.badge}
              </span>
            ) : null}
          </button>
        );
      })}
      <div style={{ flex: 1 }} />
      <button
        className="btn ghost"
        onClick={onDump}
        style={{ alignSelf: 'center', fontSize: 11 }}
      >
        <Ic.Brain s={11} /> Dump
      </button>
    </div>
  );
}
