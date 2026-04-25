interface ToggleProps {
  on: boolean;
  onChange: (next: boolean) => void;
  title?: string;
}

export function Toggle({ on, onChange, title }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={on}
      title={title}
      onClick={() => onChange(!on)}
      style={{
        width: 32,
        height: 18,
        borderRadius: 9,
        background: on ? "var(--accent)" : "var(--ink-4)",
        position: "relative",
        border: 0,
        cursor: "pointer",
        flexShrink: 0,
        padding: 0,
        transition: "background 0.15s",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 16 : 2,
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          transition: "left 0.15s",
        }}
      />
    </button>
  );
}
