import { forwardRef } from "react";
import { Ic } from "@/components";

const TAG_OPTIONS = ["#bug", "#idea", "#ask", "#design", "#write"] as const;

export interface BrainDumpCardProps {
  text: string;
  tag: string | null;
  onTextChange: (v: string) => void;
  onTagChange: (v: string | null) => void;
  onSubmit: () => void;
}

export const BrainDumpCard = forwardRef<
  HTMLTextAreaElement,
  BrainDumpCardProps
>(function BrainDumpCard(
  { text, tag, onTextChange, onTagChange, onSubmit },
  ref,
) {
  return (
    <div
      className="card no-drag"
      style={{ padding: "10px 12px", borderColor: "var(--accent)", width: 380 }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 6,
        }}
      >
        <Ic.Brain s={12} />
        <span
          style={{ fontSize: 11, fontWeight: 600, letterSpacing: "-0.005em" }}
        >
          Brain dump
        </span>
        <span
          className="mono ink-3"
          style={{ fontSize: 9, marginLeft: "auto" }}
        >
          Esc dismiss
        </span>
      </div>

      <div
        style={{
          borderBottom: "1px solid var(--line)",
          paddingBottom: 6,
          marginBottom: 8,
          minHeight: 18,
        }}
      >
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder="check if backoff wraps on 500s"
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
            lineHeight: 1.4,
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: 4,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span className="mono ink-3" style={{ fontSize: 10 }}>
          tag:
        </span>
        {TAG_OPTIONS.map((t) => (
          <button
            key={t}
            className={`chip ${tag === t ? "accent" : ""}`}
            onClick={() => onTagChange(tag === t ? null : t)}
          >
            {t}
          </button>
        ))}
        <button className="chip" title="add custom tag (todo)">
          +
        </button>
        <span
          className="mono ink-3"
          style={{ fontSize: 10, marginLeft: "auto" }}
        >
          <span className="kbd">↵</span> save
        </span>
      </div>
    </div>
  );
});
