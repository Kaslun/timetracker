import { useEffect, useRef, useState } from 'react';
import { selectLiveElapsed, selectLiveTodaySec, useStore } from '@/shared/store';
import { rpc, on } from '@/shared/api';
import { Dot, Ic, Swatch } from '@/shared/primitives';
import { formatElapsed, formatHM } from '@/shared/time';

const TAG_OPTIONS = ['#bug', '#idea', '#ask', '#design', '#write'] as const;

export function PillRoot() {
  const current = useStore((s) => s.current);
  const elapsedSec = useStore(selectLiveElapsed);
  const todaySec = useStore(selectLiveTodaySec);

  const [dumpOpen, setDumpOpen] = useState(false);
  const [dumpText, setDumpText] = useState('');
  const [dumpTag, setDumpTag] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Resize the OS window when dump opens/closes ──────────────────────────
  useEffect(() => {
    void rpc('pill:resize', { state: dumpOpen ? 'dump' : 'collapsed' });
  }, [dumpOpen]);

  // ── Listen for "open the dump" requests from global shortcut ─────────────
  useEffect(() => {
    const off = on('pill:focus-dump', () => {
      setDumpOpen(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    });
    return off;
  }, []);

  // ── Listen for keyboard inside the pill ──────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        if (dumpOpen) {
          setDumpOpen(false);
          setDumpText('');
          setDumpTag(null);
          e.preventDefault();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dumpOpen]);

  const idle = !current.running;
  const ticket = current.ticket; // e.g. "ATT-412"
  const ticketPrefix = ticket?.split('-')[0] ?? '';
  const ticketNumber = ticket?.split('-')[1] ?? '';

  const onToggle = (): void => {
    void useStore.getState().toggle();
  };

  const onBrainClick = (): void => {
    setDumpOpen((v) => !v);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const onSave = async (): Promise<void> => {
    const text = dumpText.trim();
    if (!text) {
      setDumpOpen(false);
      return;
    }
    await rpc('capture:create', { text, tag: dumpTag });
    setDumpText('');
    setDumpTag(null);
    setDumpOpen(false);
  };

  return (
    <div
      className="attensi"
      style={{
        background: 'transparent',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: dumpOpen ? 8 : 0,
        padding: 0,
      }}
    >
      {/* ── Pill shell ─────────────────────────────────────────────── */}
      <div
        className="pill-shell drag"
        style={{
          display: 'flex',
          alignItems: 'stretch',
          height: 56,
          width: 380,
        }}
      >
        {/* Ticket stub */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '0 10px',
            minWidth: 56,
            background: idle ? 'var(--surface-2)' : 'var(--accent-2)',
            borderRight: '1px solid var(--line)',
            position: 'relative',
          }}
        >
          <Swatch color={current.projectColor} size={6} />
          {ticketPrefix && (
            <div
              className="mono"
              style={{
                fontSize: 9,
                color: idle ? 'var(--ink-3)' : 'var(--accent-ink)',
                letterSpacing: '0.08em',
                marginTop: 2,
                fontWeight: 600,
              }}
            >
              {ticketPrefix}
            </div>
          )}
          <div
            className="display"
            style={{
              fontSize: 22,
              lineHeight: 1,
              fontWeight: 600,
              color: idle ? 'var(--ink-2)' : 'var(--accent)',
              marginTop: -1,
              letterSpacing: '-0.02em',
            }}
          >
            {idle ? '—' : ticketNumber || '·'}
          </div>
        </div>

        {/* Middle */}
        <div
          style={{
            flex: 1,
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            minWidth: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Dot running={current.running} />
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: idle ? 'var(--ink-3)' : 'var(--ink)',
              }}
            >
              {idle ? 'No task running' : current.title}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span
              className="mono num"
              style={{
                fontSize: 17,
                fontWeight: 500,
                letterSpacing: '-0.02em',
                color: idle ? 'var(--ink-3)' : 'var(--ink)',
              }}
            >
              {formatElapsed(elapsedSec)}
            </span>
            <span className="mono num ink-3" style={{ fontSize: 10 }}>
              {idle ? `today · ${formatHM(todaySec)}` : `/today ${formatHM(todaySec)}`}
            </span>
          </div>
        </div>

        {/* Right controls */}
        <div
          className="no-drag"
          style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--line)' }}
        >
          <button
            className="btn ghost"
            onClick={onToggle}
            title={current.running ? 'Pause (Ctrl+Space)' : 'Start (Ctrl+Space)'}
            style={{
              borderRadius: 0,
              height: 28,
              width: 40,
              borderBottom: '1px solid var(--line)',
              color: idle ? 'var(--ink-2)' : 'var(--ink)',
              padding: 0,
            }}
          >
            {current.running ? <Ic.Pause s={13} /> : <Ic.Play s={13} />}
          </button>
          <button
            className="btn ghost"
            onClick={onBrainClick}
            title="Brain dump (Ctrl+Shift+K)"
            style={{
              borderRadius: 0,
              height: 28,
              width: 40,
              background: dumpOpen ? 'var(--accent)' : 'transparent',
              color: dumpOpen ? '#fff' : 'var(--ink-2)',
              padding: 0,
            }}
          >
            <Ic.Brain s={13} />
          </button>
        </div>
      </div>

      {/* ── Brain dump card ────────────────────────────────────────── */}
      {dumpOpen && (
        <div
          className="card no-drag"
          style={{ padding: '10px 12px', borderColor: 'var(--accent)', width: 380 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Ic.Brain s={12} />
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '-0.005em' }}>Brain dump</span>
            <span className="mono ink-3" style={{ fontSize: 9, marginLeft: 'auto' }}>
              Esc dismiss
            </span>
          </div>

          <div style={{ borderBottom: '1px solid var(--line)', paddingBottom: 6, marginBottom: 8, minHeight: 18 }}>
            <textarea
              ref={inputRef}
              value={dumpText}
              onChange={(e) => setDumpText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void onSave();
                }
              }}
              placeholder="check if backoff wraps on 500s"
              rows={1}
              style={{
                width: '100%',
                background: 'transparent',
                border: 0,
                outline: 'none',
                resize: 'none',
                fontSize: 13,
                color: 'var(--ink)',
                fontFamily: 'inherit',
                lineHeight: 1.4,
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="mono ink-3" style={{ fontSize: 10 }}>tag:</span>
            {TAG_OPTIONS.map((t) => (
              <button
                key={t}
                className={`chip ${dumpTag === t ? 'accent' : ''}`}
                onClick={() => setDumpTag((cur) => (cur === t ? null : t))}
              >
                {t}
              </button>
            ))}
            <button className="chip" title="add custom tag (todo)">+</button>
            <span className="mono ink-3" style={{ fontSize: 10, marginLeft: 'auto' }}>
              <span className="kbd">↵</span> save
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
