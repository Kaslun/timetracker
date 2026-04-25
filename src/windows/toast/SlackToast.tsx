import { rpc } from '@/shared/api';
import { Ic } from '@/shared/primitives';

export function SlackToast() {
  return (
    <div className="attensi" style={{ height: '100%', padding: 6 }}>
      <div
        className="card"
        style={{
          width: '100%',
          height: '100%',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: '#4a154b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 16,
            fontWeight: 800,
          }}
        >
          #
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: '-0.005em' }}>
            Slack status synced
          </div>
          <div className="ink-3" style={{ fontSize: 11, marginTop: 2 }}>
            🎯 In focus · back at{' '}
            <span className="mono num" style={{ color: 'var(--ink)' }}>14:45</span>
          </div>
        </div>
        <button className="btn ghost icon" onClick={() => void rpc('window:close')}>
          <Ic.Close s={12} />
        </button>
      </div>
    </div>
  );
}
