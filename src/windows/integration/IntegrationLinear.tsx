import { rpc } from '@/shared/api';
import { Ic, TitleBar } from '@/shared/primitives';

const PROJECTS = ['Mobile Runtime', 'Platform', 'Growth'];

export function IntegrationLinear() {
  return (
    <div className="attensi window" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <TitleBar title="Attensi · Linear" onClose={() => void rpc('window:close')} />
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: '#5e6ad2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
          }}
        >
          L
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Linear</div>
          <div className="mono ink-3" style={{ fontSize: 10 }}>attensi.linear.app · 3 min ago</div>
        </div>
        <span className="chip">Demo</span>
        <span
          className="chip"
          style={{
            color: 'var(--ok)',
            borderColor: 'var(--ok)',
            background: 'color-mix(in oklab, var(--ok) 10%, transparent)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--ok)' }} />
          Connected
        </span>
      </div>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
        <div
          className="display"
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--ink-3)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          Auto-link tickets from
        </div>
        {PROJECTS.map((p) => (
          <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
            <Ic.Check s={12} />
            <span style={{ fontSize: 12, flex: 1 }}>{p}</span>
            <span className="mono ink-3" style={{ fontSize: 10 }}>ATT-*</span>
          </div>
        ))}
        <button
          className="btn ghost"
          style={{ padding: '4px 0', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
        >
          <Ic.Plus s={11} /> Add team
        </button>
      </div>
      <div style={{ padding: '12px 16px', flex: 1 }}>
        <div
          className="display"
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--ink-3)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          Sync both ways
        </div>
        <SyncRow label="Update status on start/stop" defaultOn={true} />
        <SyncRow label="Post elapsed time as comment" defaultOn={false} />
      </div>
    </div>
  );
}

function SyncRow({ label, defaultOn }: { label: string; defaultOn: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '4px 0', gap: 8 }}>
      <div style={{ flex: 1, fontSize: 12 }}>{label}</div>
      <div
        style={{
          width: 32,
          height: 18,
          borderRadius: 9,
          background: defaultOn ? 'var(--accent)' : 'var(--ink-4)',
          position: 'relative',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: defaultOn ? 16 : 2,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: '#fff',
          }}
        />
      </div>
    </div>
  );
}
