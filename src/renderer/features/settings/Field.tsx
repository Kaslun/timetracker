import type { ReactNode } from "react";

export interface FieldProps {
  label: string;
  sub?: string;
  children: ReactNode;
  inline?: boolean;
}

export function Field({ label, sub, children, inline = false }: FieldProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: inline ? "row" : "column",
        alignItems: inline ? "center" : "stretch",
        gap: inline ? 12 : 6,
        padding: "12px 0",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div style={{ flex: inline ? 1 : undefined }}>
        <div
          style={{ fontSize: 13, fontWeight: 500, letterSpacing: "-0.005em" }}
        >
          {label}
        </div>
        {sub && (
          <div className="ink-3" style={{ fontSize: 11, marginTop: 2 }}>
            {sub}
          </div>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

export interface NumberInputProps {
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
}

export function NumberInput({ value, onChange, suffix }: NumberInputProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        style={{
          width: 60,
          background: "var(--surface-2)",
          border: "1px solid var(--line)",
          borderRadius: 6,
          padding: "4px 6px",
          fontSize: 13,
          color: "var(--ink)",
        }}
      />
      {suffix && (
        <span className="mono ink-3" style={{ fontSize: 11 }}>
          {suffix}
        </span>
      )}
    </div>
  );
}

export function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div
      className="display"
      style={{
        fontSize: 14,
        fontWeight: 600,
        marginTop: 24,
        marginBottom: 8,
        color: "var(--ink-2)",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <>
      <div
        className="display"
        style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-0.01em" }}
      >
        {title}
      </div>
      {sub && (
        <div
          className="ink-3"
          style={{ fontSize: 11, marginTop: 2, marginBottom: 16 }}
        >
          {sub}
        </div>
      )}
    </>
  );
}
