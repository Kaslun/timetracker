import { useMemo, useState, type CSSProperties } from 'react';
import { useStore } from '@/shared/store';
import { rpc } from '@/shared/api';
import { Ic, TitleBar } from '@/shared/primitives';
import { formatHM, isoDate, startOfWeek, endOfWeek } from '@/shared/time';
import {
  aggregateByProject,
  avgFocusMinutes,
  bucketByDay,
  countFocusSessions,
  fmtPeriod,
} from './selectors';

const DASH_COLUMNS = [
  { id: 'date',     label: 'Date',     req: true },
  { id: 'start',    label: 'Start',    req: false },
  { id: 'end',      label: 'End',      req: false },
  { id: 'duration', label: 'Duration', req: true },
  { id: 'project',  label: 'Project',  req: true },
  { id: 'ticket',   label: 'Ticket',   req: false },
  { id: 'task',     label: 'Task',     req: true },
  { id: 'tag',      label: 'Tag',      req: false },
] as const;

type ColId = typeof DASH_COLUMNS[number]['id'];

const DASH_PRESETS = [
  { id: 'sheets',  label: 'Sheets',  hint: 'all columns'      },
  { id: 'toggl',   label: 'Toggl',   hint: 'import-ready'      },
  { id: 'harvest', label: 'Harvest', hint: 'proj/task/hours'   },
  { id: 'custom',  label: 'Custom',  hint: 'pick yourself'     },
] as const;
type PresetId = typeof DASH_PRESETS[number]['id'];

const PRESET_DEFAULT_COLS: Record<PresetId, ColId[]> = {
  sheets:  ['date', 'start', 'end', 'duration', 'project', 'ticket', 'task', 'tag'],
  toggl:   ['date', 'start', 'end', 'duration', 'project', 'task', 'tag'],
  harvest: ['date', 'duration', 'project', 'task'],
  custom:  ['date', 'duration', 'project', 'task'],
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function clockOf(ts: number): string {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

const cellStyle: CSSProperties = {
  padding: '6px 12px',
  color: 'var(--ink-2)',
  whiteSpace: 'nowrap',
};

const labelStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: 'var(--ink-3)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: 7,
};

interface StatProps {
  label: string;
  value: string;
  sub?: string;
  tone?: 'pos' | 'warn' | 'neutral';
}

function Stat({ label, value, sub, tone = 'neutral' }: StatProps) {
  const toneColor =
    tone === 'pos' ? 'var(--accent)' : tone === 'warn' ? 'var(--warn)' : 'var(--ink-3)';
  return (
    <div
      style={{
        padding: '11px 13px',
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius)',
        minWidth: 0,
      }}
    >
      <div
        className="display ink-3"
        style={{
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        className="display num"
        style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.015em', lineHeight: 1 }}
      >
        {value}
      </div>
      {sub && (
        <div className="mono" style={{ fontSize: 10, marginTop: 4, color: toneColor }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function DashboardRoot() {
  const entries = useStore((s) => s.entries);

  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [preset, setPreset] = useState<PresetId>('sheets');
  const [grouping, setGrouping] = useState<'entry' | 'task' | 'proj'>('entry');
  const [cols, setCols] = useState<Record<ColId, boolean>>(() => {
    const init: Record<ColId, boolean> = {} as Record<ColId, boolean>;
    for (const c of DASH_COLUMNS) init[c.id] = true;
    return init;
  });

  const buckets = useMemo(() => bucketByDay(entries, anchor), [entries, anchor]);
  const projects = useMemo(() => {
    const inWeek = entries.filter(
      (e) => e.startedAt >= startOfWeek(anchor).getTime() && e.startedAt <= endOfWeek(anchor).getTime()
    );
    const all = aggregateByProject(inWeek);
    if (all.length <= 4) return all;
    const top = all.slice(0, 3);
    const otherHours = all.slice(3).reduce((acc, p) => acc + p.hours, 0);
    return [
      ...top,
      { projectId: '__other__', projectName: 'Other', projectColor: 'var(--ink-3)', hours: otherHours },
    ];
  }, [entries, anchor]);
  const projTotal = projects.reduce((acc, p) => acc + p.hours, 0);
  const weekTotalH = buckets.reduce((acc, b) => acc + b.hours, 0);
  const weekTotal = `${Math.floor(weekTotalH)}h ${pad2(Math.round((weekTotalH % 1) * 60))}m`;

  const period = fmtPeriod(anchor);

  // Filtered rows
  const rowsAll = entries.filter(
    (e) => e.startedAt >= startOfWeek(anchor).getTime() && e.startedAt <= endOfWeek(anchor).getTime()
  );
  const rows = selectedDay === 'all'
    ? rowsAll
    : rowsAll.filter((e) => {
        const d = new Date(e.startedAt);
        d.setHours(0, 0, 0, 0);
        return ['Mon','Tue','Wed','Thu','Fri'][((d.getDay() + 6) % 7)] === selectedDay;
      });

  // Stats
  const focusSessions = countFocusSessions(rowsAll);
  const avgMin = avgFocusMinutes(rowsAll);
  const topProject = projects[0];

  // 4-stat strip
  const stats = [
    { label: 'Logged', value: weekTotal, sub: `${buckets.filter((b) => b.hours > 0).length} of 5 days`, tone: 'pos' as const },
    { label: 'Unlogged gaps', value: '1h 46m', sub: '4 suggestions waiting', tone: 'warn' as const },
    { label: 'Focus sessions', value: String(focusSessions), sub: `avg ${avgMin} min`, tone: 'pos' as const },
    { label: 'Top project', value: topProject ? topProject.projectName.slice(0, 12) : '—', sub: topProject ? `${topProject.hours.toFixed(1)}h · ${Math.round((topProject.hours / Math.max(0.01, weekTotalH)) * 100)}%` : '' },
  ];

  // Toggle column
  const toggleCol = (id: ColId): void => {
    const c = DASH_COLUMNS.find((x) => x.id === id)!;
    if (c.req) return;
    setCols((s) => ({ ...s, [id]: !s[id] }));
  };

  const onPickPreset = (p: PresetId): void => {
    setPreset(p);
    const enabled = new Set(PRESET_DEFAULT_COLS[p]);
    const next: Record<ColId, boolean> = {} as Record<ColId, boolean>;
    for (const c of DASH_COLUMNS) {
      if (c.req) next[c.id] = true;
      else next[c.id] = enabled.has(c.id);
    }
    setCols(next);
  };

  const onDownload = async (): Promise<void> => {
    const activeCols = (Object.keys(cols) as ColId[]).filter((c) => cols[c]);
    const dayMap: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4 };
    const range = selectedDay === 'all' ? 'week' : 'custom';
    let from: number | undefined;
    let to: number | undefined;
    if (selectedDay !== 'all') {
      const start = startOfWeek(anchor);
      start.setDate(start.getDate() + (dayMap[selectedDay] ?? 0));
      from = start.getTime();
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      to = end.getTime();
    }
    await rpc('export:csv', {
      range,
      from,
      to,
      columns: activeCols,
      grouping,
      preset,
    });
  };

  // ── Weekly bar chart ─────────────────────────────────────────────────────
  const maxHrs = Math.max(8.5, ...buckets.map((b) => b.hours));

  const chart = (
    <div
      style={{
        padding: '14px 18px',
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
        <div className="display" style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.005em' }}>
          Hours by day
        </div>
        <span style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 3 }}>
          <button className="btn">W</button>
          <button className="btn ghost">M</button>
          <button className="btn ghost">Q</button>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 160 }}>
        {buckets.map((d) => {
          const h = Math.max((d.hours / maxHrs) * 140, 2);
          const isSel = selectedDay === d.day;
          const dim = selectedDay !== 'all' && !isSel;
          return (
            <button
              key={d.day}
              onClick={() => setSelectedDay(isSel ? 'all' : d.day)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 5,
                cursor: 'pointer',
                opacity: dim ? 0.35 : 1,
                transition: 'opacity 0.15s',
                background: 'transparent',
                border: 0,
                padding: 0,
              }}
            >
              <div
                className="mono num"
                style={{
                  fontSize: 10,
                  color: d.isToday || isSel ? 'var(--accent)' : 'var(--ink-3)',
                  fontWeight: 600,
                }}
              >
                {d.hours > 0 ? `${d.hours.toFixed(1)}h` : '—'}
              </div>
              <div
                style={{
                  width: '100%',
                  height: 140,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                }}
              >
                {d.hours > 0 ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      height: h,
                      width: '100%',
                      borderRadius: '3px 3px 0 0',
                      overflow: 'hidden',
                      border: isSel ? '1.5px solid var(--accent)' : '1px solid var(--line)',
                      borderBottom: 'none',
                    }}
                  >
                    {d.perProject.map((p, ti) => {
                      const frac = p.hours / d.hours;
                      const colors = [
                        'var(--accent)',
                        'color-mix(in oklab, var(--accent) 55%, transparent)',
                        'var(--ink-3)',
                        'var(--ink-4)',
                      ];
                      return (
                        <div
                          key={p.projectId}
                          style={{
                            height: `${frac * 100}%`,
                            background: colors[ti] ?? 'var(--ink-4)',
                            borderTop: ti > 0 ? '1px solid rgba(255,255,255,0.15)' : 'none',
                          }}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div
                    style={{
                      height: 28,
                      border: '1px dashed var(--line-2)',
                      borderRadius: '3px 3px 0 0',
                      background: 'var(--bg-2)',
                    }}
                  />
                )}
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: d.isToday ? 'var(--accent)' : 'var(--ink-2)',
                  letterSpacing: '0.02em',
                }}
              >
                {d.day}
              </div>
            </button>
          );
        })}
      </div>
      <div className="mono ink-3" style={{ fontSize: 10, textAlign: 'center', marginTop: 10 }}>
        {selectedDay === 'all'
          ? 'Tap a day to scope the table + export below'
          : (
            <>
              Filtered to <span style={{ color: 'var(--accent)' }}>{selectedDay}</span> ·{' '}
              <button
                onClick={() => setSelectedDay('all')}
                style={{ textDecoration: 'underline', cursor: 'pointer', color: 'inherit' }}
              >
                show all
              </button>
            </>
          )}
      </div>
    </div>
  );

  // ── Project breakdown ────────────────────────────────────────────────────
  const breakdown = (
    <div
      style={{
        padding: '14px 18px',
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
        <div className="display" style={{ fontSize: 13, fontWeight: 600 }}>By project</div>
        <span style={{ flex: 1 }} />
        <span className="mono ink-3" style={{ fontSize: 10 }}>
          {projTotal.toFixed(1)}h total
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {projects.map((p, i) => {
          const colors = [
            'var(--accent)',
            'color-mix(in oklab, var(--accent) 55%, transparent)',
            'var(--ink-3)',
            'var(--ink-4)',
          ];
          const color = colors[i] ?? p.projectColor;
          const pct = projTotal > 0 ? p.hours / projTotal : 0;
          return (
            <div key={p.projectId}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: color, flexShrink: 0 }} />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.projectName}
                </span>
                <span className="mono num" style={{ fontSize: 11, color: 'var(--ink-2)' }}>
                  {p.hours.toFixed(1)}h
                </span>
                <span className="mono ink-3" style={{ fontSize: 10, width: 32, textAlign: 'right' }}>
                  {Math.round(pct * 100)}%
                </span>
              </div>
              <div
                style={{
                  height: 4,
                  borderRadius: 2,
                  background: 'var(--bg-2)',
                  overflow: 'hidden',
                }}
              >
                <div style={{ width: `${pct * 100}%`, height: '100%', background: color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const activeColIds = (Object.keys(cols) as ColId[]).filter((c) => cols[c]);

  // ── Entries table ────────────────────────────────────────────────────────
  const entriesPanel = (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <div
        style={{
          padding: '11px 16px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--surface-2)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div className="display" style={{ fontSize: 13, fontWeight: 600 }}>
          Entries{' '}
          {selectedDay !== 'all' && (
            <span className="mono ink-3" style={{ fontWeight: 400, fontSize: 11, marginLeft: 6 }}>
              · {selectedDay}
            </span>
          )}
        </div>
        <span className="mono ink-3" style={{ fontSize: 10 }}>{rows.length} rows</span>
        <span style={{ flex: 1 }} />
        <span className="mono ink-3" style={{ fontSize: 10 }}>
          {activeColIds.length}/{DASH_COLUMNS.length} cols ·
        </span>
        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-2)' }}>
          attensi-week-{isoDate(anchor)}.csv
        </span>
      </div>
      <div style={{ overflow: 'auto', flex: 1, maxHeight: 260 }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
          }}
        >
          <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr style={{ background: 'var(--bg-2)' }}>
              {DASH_COLUMNS.filter((c) => cols[c.id]).map((c) => (
                <th
                  key={c.id}
                  style={{
                    padding: '7px 12px',
                    textAlign: 'left',
                    borderBottom: '1px solid var(--line-2)',
                    color: 'var(--ink-2)',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    letterSpacing: 0,
                  }}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const running = r.endedAt == null;
              const dur = ((r.endedAt ?? Date.now()) - r.startedAt) / 3_600_000;
              return (
                <tr
                  key={r.id}
                  style={{
                    borderBottom: '1px solid var(--line)',
                    background: running ? 'color-mix(in oklab, var(--accent) 6%, transparent)' : 'transparent',
                  }}
                >
                  {cols.date && <td style={cellStyle}>{isoDate(new Date(r.startedAt))}</td>}
                  {cols.start && <td style={cellStyle}>{clockOf(r.startedAt)}</td>}
                  {cols.end && (
                    <td style={cellStyle}>
                      {running ? (
                        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>● running</span>
                      ) : r.endedAt != null ? (
                        clockOf(r.endedAt)
                      ) : (
                        '—'
                      )}
                    </td>
                  )}
                  {cols.duration && (
                    <td style={{ ...cellStyle, fontWeight: 600, color: 'var(--ink)' }}>
                      {dur.toFixed(2)}
                    </td>
                  )}
                  {cols.project && <td style={cellStyle}>{r.projectName}</td>}
                  {cols.ticket && (
                    <td style={cellStyle}>
                      {r.ticket ?? <span className="ink-3">—</span>}
                    </td>
                  )}
                  {cols.task && (
                    <td style={{ ...cellStyle, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.taskTitle}
                    </td>
                  )}
                  {cols.tag && (
                    <td style={cellStyle}>
                      {r.tag ? (
                        <span
                          style={{
                            padding: '1px 6px',
                            borderRadius: 3,
                            background: 'var(--bg-2)',
                            fontSize: 9,
                            color: 'var(--ink-2)',
                          }}
                        >
                          {r.tag}
                        </span>
                      ) : null}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ── Export panel ─────────────────────────────────────────────────────────
  const exportPanel = (
    <div
      style={{
        padding: '14px 18px',
        background: 'var(--surface-2)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="display" style={{ fontSize: 13, fontWeight: 600 }}>Export</div>
        <span className="mono ink-3" style={{ fontSize: 10 }}>
          {rows.length} rows · {activeColIds.length} cols ·{' '}
          {grouping === 'entry' ? 'per entry' : grouping === 'task' ? 'per task/day' : 'per project/day'}
        </span>
        <span style={{ flex: 1 }} />
        <button
          className="btn"
          style={{ fontSize: 10, padding: '4px 10px', display: 'flex', gap: 5, alignItems: 'center' }}
          title="Email copy (todo)"
          disabled
        >
          <Ic.Calendar s={10} /> Schedule
        </button>
        <button
          className="btn accent"
          onClick={() => void onDownload()}
          style={{ fontSize: 11, padding: '6px 14px', display: 'flex', gap: 6, alignItems: 'center', fontWeight: 600 }}
        >
          <Ic.Download s={11} /> Download CSV
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, alignItems: 'start' }}>
        <div>
          <div className="display ink-3" style={labelStyle}>Preset</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {DASH_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => onPickPreset(p.id)}
                style={{
                  padding: '5px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${preset === p.id ? 'var(--accent)' : 'var(--line)'}`,
                  background: preset === p.id
                    ? 'color-mix(in oklab, var(--accent) 10%, var(--surface))'
                    : 'var(--surface)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 500 }}>{p.label}</div>
                <div className="mono ink-3" style={{ fontSize: 9, marginTop: 1 }}>{p.hint}</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="display ink-3" style={labelStyle}>Columns</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {DASH_COLUMNS.map((c) => {
              const on = cols[c.id];
              return (
                <button
                  key={c.id}
                  onClick={() => toggleCol(c.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 8px',
                    borderRadius: 999,
                    border: `1px solid ${on ? 'var(--accent)' : 'var(--line-2)'}`,
                    background: on
                      ? 'color-mix(in oklab, var(--accent) 10%, var(--surface))'
                      : 'var(--surface)',
                    color: on ? 'var(--accent-ink)' : 'var(--ink-3)',
                    cursor: c.req ? 'default' : 'pointer',
                    fontSize: 10,
                    fontWeight: 500,
                    opacity: c.req && !on ? 0.4 : 1,
                  }}
                >
                  {on && <Ic.Check s={8} />}
                  <span>{c.label}</span>
                  {c.req && (
                    <span className="mono" style={{ fontSize: 8, opacity: 0.6 }}>req</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <div className="display ink-3" style={labelStyle}>Group rows</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {([
              { id: 'entry' as const, label: 'Each entry' },
              { id: 'task' as const,  label: 'Per task / day' },
              { id: 'proj' as const,  label: 'Per project / day' },
            ]).map((g) => (
              <button
                key={g.id}
                onClick={() => setGrouping(g.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  padding: '2px 0',
                  background: 'transparent',
                  border: 0,
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: 'inherit',
                }}
              >
                <span
                  style={{
                    width: 11,
                    height: 11,
                    borderRadius: '50%',
                    border: `1.5px solid ${grouping === g.id ? 'var(--accent)' : 'var(--ink-4)'}`,
                    background: grouping === g.id ? 'var(--accent)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {grouping === g.id && (
                    <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#fff' }} />
                  )}
                </span>
                <span style={{ color: grouping === g.id ? 'var(--ink)' : 'var(--ink-2)' }}>
                  {g.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ── Compose ──────────────────────────────────────────────────────────────
  return (
    <div className="attensi window" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TitleBar title="Attensi · Dashboard" onClose={() => void rpc('window:close')} />
      <div
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div
            className="display"
            style={{
              fontSize: 11,
              color: 'var(--ink-3)',
              fontWeight: 500,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {period.label}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div
              className="display num"
              style={{ fontSize: 26, fontWeight: 500, letterSpacing: '-0.015em', lineHeight: 1 }}
            >
              {weekTotal}
            </div>
          </div>
        </div>
        <span style={{ flex: 1 }} />
        <button
          className="btn icon"
          title="Previous"
          onClick={() => setAnchor((a) => new Date(a.getTime() - 7 * 24 * 60 * 60 * 1000))}
        >
          <Ic.Chevron s={11} dir="left" />
        </button>
        <button className="btn" onClick={() => setAnchor(new Date())}>This week</button>
        <button
          className="btn icon"
          title="Next"
          onClick={() => setAnchor((a) => new Date(a.getTime() + 7 * 24 * 60 * 60 * 1000))}
        >
          <Ic.Chevron s={11} dir="right" />
        </button>
      </div>

      <div
        className="scroll"
        style={{
          flex: 1,
          padding: '16px 20px',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          background: 'var(--bg-2)',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {stats.map((s) => (
            <Stat key={s.label} {...s} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
          {chart}
          {breakdown}
        </div>
        {entriesPanel}
        {exportPanel}
      </div>
    </div>
  );
}

void formatHM;
