import { useEffect, useState } from "react";
import { useStore } from "@/store";
import { EmptyState, Ic, TagPicker } from "@/components";
import { rpc } from "@/lib/api";
import { useTags } from "@/lib/useTags";
import {
  clearDraft,
  getDraft,
  setDraft as persistDraft,
} from "@/lib/brainDumpDraft";

function relativeWhen(ts: number, now: number): string {
  const diff = Math.max(0, now - ts);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 2) return "yesterday";
  return `${d}d ago`;
}

export function InboxTab() {
  const captures = useStore((s) => s.captures);
  const tick = useStore((s) => s.tick);
  const [draft, setDraftLocal] = useState(() => getDraft());
  const { tags } = useTags();

  // Persist any in-progress draft so the close-quit auto-save can recover it.
  useEffect(() => {
    persistDraft(draft);
  }, [draft]);

  const setDraft = (value: string): void => setDraftLocal(value);

  const untagged = captures.filter((c) => !c.tag).length;

  const onCommit = async (): Promise<void> => {
    const text = draft.trim();
    if (!text) return;
    await rpc("capture:create", { text });
    setDraft("");
    clearDraft();
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)" }}
      >
        <div
          style={{
            border: "1px solid var(--line-2)",
            borderRadius: "var(--radius)",
            padding: "10px 12px",
            background: "var(--surface-2)",
            minHeight: 54,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 4,
            }}
          >
            <Ic.Brain s={12} />
            <span style={{ fontSize: 11, fontWeight: 600 }}>New thought</span>
            <span className="kbd" style={{ marginLeft: "auto" }}>
              B
            </span>
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void onCommit();
              }
            }}
            placeholder="Drop it here and keep going…"
            rows={1}
            style={{
              width: "100%",
              background: "transparent",
              border: 0,
              outline: "none",
              resize: "none",
              fontSize: 13,
              color: "var(--ink)",
              fontFamily: "inherit",
            }}
          />
        </div>
        <div
          style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}
        >
          {tags.map((t) => (
            <span key={t} className="chip">
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="scroll" style={{ flex: 1, overflow: "auto" }}>
        <div
          style={{
            padding: "12px 16px 6px",
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
          }}
        >
          <span
            className="display"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--ink-2)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Recent · {captures.length}
          </span>
          {untagged > 0 && (
            <span className="mono ink-3" style={{ fontSize: 10 }}>
              {untagged} untagged
            </span>
          )}
        </div>
        {captures.length === 0 ? (
          <EmptyState
            icon={<Ic.Brain s={20} />}
            title="Brain dump is empty"
            hint="Press B (or Ctrl+Shift+B from anywhere) to drop a thought without losing focus."
          />
        ) : null}
        {captures.map((c) => (
          <div
            key={c.id}
            style={{
              display: "flex",
              gap: 10,
              padding: "12px 16px",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <button
              onClick={() => void rpc("capture:archive", { id: c.id })}
              title="Archive"
              style={{
                width: 14,
                height: 14,
                borderRadius: 4,
                marginTop: 2,
                border: "1.2px solid var(--ink-4)",
                background: c.tag ? "var(--ink-3)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--surface)",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {c.tag && <Ic.Check s={9} />}
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, lineHeight: 1.35 }}>{c.text}</div>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  marginTop: 5,
                  alignItems: "center",
                }}
              >
                <span className="mono ink-3" style={{ fontSize: 10 }}>
                  {relativeWhen(c.createdAt, tick)}
                </span>
                <TagPicker
                  value={c.tag ?? null}
                  onChange={(t) =>
                    void rpc("capture:tag", { id: c.id, tag: t })
                  }
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
