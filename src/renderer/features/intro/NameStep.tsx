import { useEffect, useRef } from "react";
import { Ic } from "@/components";

export interface NameStepProps {
  name: string;
  onChange: (name: string) => void;
  onSubmit: () => void;
}

export function NameStep({ name, onChange, onSubmit }: NameStepProps) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <span
          className="mono"
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "var(--accent)",
            letterSpacing: "0.1em",
          }}
        >
          01
        </span>
        <div
          style={{ fontSize: 14, fontWeight: 500, letterSpacing: "-0.005em" }}
        >
          What should we call you?
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          border: `1.5px solid ${name ? "var(--accent)" : "var(--line-2)"}`,
          borderRadius: "var(--radius)",
          padding: "10px 14px",
          background: "var(--surface)",
          transition: "border-color 0.15s",
        }}
      >
        <span className="ink-3" style={{ fontSize: 15, marginRight: 8 }}>
          Hi,
        </span>
        <input
          ref={ref}
          type="text"
          value={name}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name) onSubmit();
          }}
          placeholder="Marta"
          className="input"
          style={{
            flex: 1,
            fontSize: 15,
            fontWeight: 500,
            fontFamily: "var(--font-ui)",
            letterSpacing: "-0.01em",
            background: "transparent",
            border: 0,
          }}
        />
        {name && (
          <span
            className="mono"
            style={{ fontSize: 11, color: "var(--accent)", marginLeft: 8 }}
          >
            <Ic.Check s={12} />
          </span>
        )}
      </div>
    </div>
  );
}
