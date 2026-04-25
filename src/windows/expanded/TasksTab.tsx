import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/shared/store';
import { Ic, Swatch } from '@/shared/primitives';
import { rpc, on } from '@/shared/api';
import { formatElapsed, formatHM } from '@/shared/time';
import type { TaskWithProject } from '@shared/models';

export function TasksTab() {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newProjectId, setNewProjectId] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const off = on('expanded:focus-search', () => inputRef.current?.focus());
    return off;
  }, []);

  const todayLogged = tasks.reduce((acc, t) => acc + t.todaySec, 0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.projectName.toLowerCase().includes(q) ||
        (t.ticket?.toLowerCase().includes(q) ?? false)
    );
  }, [query, tasks]);

  const start = (t: TaskWithProject) => async (): Promise<void> => {
    if (t.active) {
      await useStore.getState().pause();
    } else {
      await useStore.getState().start(t.id);
    }
  };

  const onCreate = async (): Promise<void> => {
    const title = query.trim();
    if (!title || !newProjectId) return;
    await rpc('task:create', { projectId: newProjectId, title });
    setQuery('');
    setShowCreate(false);
  };

  const showCreateRow = query.trim().length > 0 && filtered.length === 0;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <Ic.Search s={13} />
        <input
          ref={inputRef}
          className="input"
          placeholder="Switch task · paste Linear/Jira url · or type new"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (showCreateRow && newProjectId) void onCreate();
              else if (filtered[0]) void start(filtered[0])();
            }
          }}
          style={{ fontSize: 12, flex: 1 }}
        />
        <span className="kbd">Ctrl+K</span>
      </div>
      <div className="scroll" style={{ flex: 1, overflow: 'auto' }}>
        <div
          style={{
            padding: '10px 14px 6px',
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
          }}
        >
          <span
            className="display"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--ink-2)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Today · {tasks.length} tasks
          </span>
          <span className="mono num ink-3" style={{ fontSize: 10 }}>
            {formatHM(todayLogged)}
          </span>
        </div>

        {filtered.map((t) => (
          <div
            key={t.id}
            onClick={() => void start(t)()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 14px',
              borderLeft: t.active ? '2px solid var(--accent)' : '2px solid transparent',
              background: t.active ? 'color-mix(in oklab, var(--accent) 5%, var(--surface))' : 'transparent',
              cursor: 'pointer',
            }}
          >
            <Swatch color={t.projectColor} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: t.active ? 500 : 400,
                  lineHeight: 1.3,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {t.title}
              </div>
              <div className="mono ink-3" style={{ fontSize: 10, marginTop: 2 }}>
                {t.ticket ?? '—'} · {t.projectName}
              </div>
            </div>
            {t.tag ? <span className="chip">{t.tag}</span> : null}
            <span
              className="mono num"
              style={{
                fontSize: 12,
                color: t.active ? 'var(--accent)' : 'var(--ink-2)',
                fontWeight: t.active ? 600 : 500,
                minWidth: 56,
                textAlign: 'right',
              }}
            >
              {formatElapsed(t.todaySec)}
            </span>
            {t.active ? <Ic.Pause s={11} /> : <Ic.Play s={11} />}
          </div>
        ))}

        {showCreateRow && (
          <div
            style={{
              padding: '12px 14px',
              borderTop: '1px solid var(--line)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>
              No matches — create a new task “{query}”?
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <select
                value={newProjectId}
                onChange={(e) => setNewProjectId(e.target.value)}
                className="input"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--line)',
                  borderRadius: 6,
                  padding: '4px 6px',
                  fontSize: 12,
                  flex: 1,
                }}
              >
                <option value="">Pick project…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button
                className="btn primary"
                disabled={!newProjectId}
                onClick={() => void onCreate()}
              >
                Create
              </button>
            </div>
          </div>
        )}

        {!showCreate && (
          <div style={{ padding: '14px 14px 6px' }}>
            <span
              className="display"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--ink-3)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Recent · past 7 days
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
