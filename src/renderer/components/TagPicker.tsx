import { useEffect, useRef, useState } from "react";
import { Ic } from "@/components";
import { normalizeTagLabel } from "@/lib/tags";
import { useTags } from "@/lib/useTags";

export interface TagPickerProps {
  /** Currently selected tag, or null when no tag is set yet. */
  value: string | null;
  onChange: (tag: string | null) => void;
  /** Optional CTA shown in the closed state when no value is set. */
  placeholder?: string;
  /** When true, render the popover stacked above the trigger. */
  openUp?: boolean;
}

/**
 * Inline, theme-aware tag picker shared between the brain-dump card
 * and the inbox row. All surfaces use CSS variables so it adapts to
 * every theme — no hardcoded white background bleed in dark themes.
 */
export function TagPicker({
  value,
  onChange,
  placeholder = "needs tag",
  openUp = false,
}: TagPickerProps) {
  const { tags, createTag } = useTags();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent): void => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setDraft("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const onPick = (tag: string): void => {
    onChange(tag === value ? null : tag);
    setOpen(false);
    setDraft("");
  };

  const onCreate = async (): Promise<void> => {
    const norm = normalizeTagLabel(draft);
    if (!norm) return;
    const created = await createTag(norm);
    if (created) {
      onChange(created);
      setOpen(false);
      setDraft("");
    }
  };

  const triggerLabel = value ?? placeholder;

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        className={`chip ${value ? "accent" : ""}`}
        onClick={() => setOpen((v) => !v)}
        style={{
          cursor: "pointer",
          ...(value
            ? {}
            : {
                color: "var(--accent)",
                borderColor: "var(--accent)",
                background: "transparent",
              }),
        }}
      >
        {triggerLabel}
        <Ic.Chevron s={9} style={{ marginLeft: 2, opacity: 0.6 }} />
      </button>

      {open ? (
        <div
          role="dialog"
          style={{
            position: "absolute",
            zIndex: 50,
            ...(openUp
              ? { bottom: "calc(100% + 6px)" }
              : { top: "calc(100% + 6px)" }),
            left: 0,
            minWidth: 180,
            padding: 8,
            background: "var(--surface)",
            color: "var(--ink)",
            border: "1px solid var(--line-2)",
            borderRadius: "var(--radius)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
              marginBottom: 8,
            }}
          >
            {tags.map((t) => (
              <button
                key={t}
                type="button"
                className={`chip ${value === t ? "accent" : ""}`}
                onClick={() => onPick(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void onCreate();
                } else if (e.key === "Escape") {
                  setOpen(false);
                  setDraft("");
                }
              }}
              placeholder="new tag…"
              style={{
                flex: 1,
                background: "var(--surface-2)",
                color: "var(--ink)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-sm)",
                padding: "4px 8px",
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                outline: "none",
              }}
            />
            <button
              type="button"
              className="chip accent"
              onClick={() => void onCreate()}
              disabled={!normalizeTagLabel(draft)}
              style={{ cursor: "pointer" }}
            >
              add
            </button>
          </div>
          {value ? (
            <button
              type="button"
              className="chip"
              onClick={() => onPick(value)}
              style={{ marginTop: 8, cursor: "pointer" }}
            >
              clear
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
