import { ServiceTile } from "./ServiceTile";
import { SERVICES } from "@/lib/integrations";

export interface ToolsStepProps {
  connected: Record<string, boolean>;
  onToggle: (id: string) => void;
}

export function ToolsStep({ connected, onToggle }: ToolsStepProps) {
  const count = Object.values(connected).filter(Boolean).length;
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          marginBottom: 4,
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
          02
        </span>
        <div
          style={{ fontSize: 14, fontWeight: 500, letterSpacing: "-0.005em" }}
        >
          Link your tools
        </div>
        <span style={{ flex: 1 }} />
        <span className="mono ink-3" style={{ fontSize: 10 }}>
          {count} selected
        </span>
      </div>
      <div className="ink-3" style={{ fontSize: 11, marginBottom: 12 }}>
        We'll pull context so you can log in a click. Skip — add later anytime.
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 20,
        }}
      >
        {SERVICES.map((s) => (
          <ServiceTile
            key={s.id}
            s={s}
            connected={!!connected[s.id]}
            onToggle={() => onToggle(s.id)}
          />
        ))}
      </div>
    </div>
  );
}
