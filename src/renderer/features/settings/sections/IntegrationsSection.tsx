import { useStore } from "@/store";
import { SERVICES } from "@/lib/integrations";
import { Toggle } from "../Toggle";
import { SectionTitle } from "../Field";

export function IntegrationsSection() {
  const settings = useStore((s) => s.settings);
  const patchSettings = useStore((s) => s.patchSettings);

  const setIntegration = (id: string, on: boolean): void => {
    void patchSettings({
      integrationsConnected: { ...settings.integrationsConnected, [id]: on },
    });
  };

  return (
    <>
      <SectionTitle
        title="Integrations"
        sub="v1 ships with friendly mocks — connections persist but don't call live APIs yet."
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {SERVICES.map((s) => {
          const on = !!settings.integrationsConnected[s.id];
          return (
            <div
              key={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                border: `1.5px solid ${on ? "var(--accent)" : "var(--line)"}`,
                borderRadius: "var(--radius)",
                background: on
                  ? "color-mix(in oklab, var(--accent) 6%, var(--surface))"
                  : "var(--surface)",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: s.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  flexShrink: 0,
                }}
              >
                {s.letter}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    letterSpacing: "-0.005em",
                  }}
                >
                  {s.label}
                </div>
                <div
                  className="mono ink-3"
                  style={{ fontSize: 10, marginTop: 1 }}
                >
                  {s.meta}
                </div>
              </div>
              {on && <span className="chip">Demo</span>}
              <Toggle on={on} onChange={(v) => setIntegration(s.id, v)} />
            </div>
          );
        })}
      </div>
    </>
  );
}
