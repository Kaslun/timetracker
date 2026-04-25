import { rpc } from '@/shared/api';

export function TeamsToast() {
  return (
    <div className="attensi" style={{ height: '100%', padding: 6 }}>
      <div className="card" style={{ width: '100%', height: '100%', padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: '#5059c9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            T
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 500 }}>Meeting wrapped</div>
            <div className="mono ink-3" style={{ fontSize: 10 }}>Teams · 55 min</div>
          </div>
          <span className="chip">Design sync</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.4, marginBottom: 10 }}>
          Log as <strong>Design sync — tracker v2</strong>?
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn" style={{ flex: 1 }} onClick={() => void rpc('window:close')}>
            Skip
          </button>
          <button className="btn accent" style={{ flex: 2 }} onClick={() => void rpc('window:close')}>
            Log 55 min
          </button>
        </div>
      </div>
    </div>
  );
}
