import { Ic, Ring, Swatch } from '@/shared/primitives';
import { selectLiveElapsed, selectLiveTodaySec, useStore } from '@/shared/store';
import { formatElapsed, formatHM } from '@/shared/time';
import { rpc } from '@/shared/api';

const DAY_TARGET_SEC = 8 * 3600;

export function Cockpit() {
  const current = useStore((s) => s.current);
  const elapsedSec = useStore(selectLiveElapsed);
  const todaySec = useStore(selectLiveTodaySec);

  const pct = Math.min(1, todaySec / DAY_TARGET_SEC);
  const remainingSec = Math.max(0, DAY_TARGET_SEC - todaySec);
  const remainingLabel = formatHM(remainingSec) || '0m';

  const onTogglePlayPause = (): void => {
    void useStore.getState().toggle();
  };

  const onPickTask = (): void => {
    // Switch to tasks tab and focus search
    void rpc('window:setExpandedTab', { tab: 'list' });
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <Ring size={52} pct={pct} stroke={4} muted={!current.running}>
        <span className="mono num" style={{ fontSize: 12, fontWeight: 600, lineHeight: 1 }}>
          {remainingLabel}
        </span>
        <span className="mono ink-3" style={{ fontSize: 8, marginTop: 1, letterSpacing: '0.05em' }}>
          {Math.round(pct * 100)}%
        </span>
      </Ring>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          {current.ticket ? <span className="chip accent">{current.ticket}</span> : null}
          {current.projectName ? (
            <span className="chip">
              <Swatch color={current.projectColor} size={6} />
              {current.projectName}
            </span>
          ) : null}
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            color: current.running ? 'var(--ink)' : 'var(--ink-2)',
          }}
        >
          {current.title}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <span className="mono num" style={{ fontSize: 11, color: 'var(--ink-2)' }}>
            {formatElapsed(elapsedSec)}
          </span>
          <span className="mono num ink-3" style={{ fontSize: 11 }}>
            today {formatHM(todaySec)}
          </span>
        </div>
      </div>
      <button
        className={current.running ? 'btn primary' : 'btn accent'}
        onClick={current.taskId ? onTogglePlayPause : onPickTask}
        style={{ width: 34, height: 34, borderRadius: '50%', padding: 0 }}
        title={current.running ? 'Pause' : current.taskId ? 'Resume' : 'Pick a task'}
      >
        {current.running ? <Ic.Pause s={14} /> : <Ic.Play s={14} />}
      </button>
    </div>
  );
}
