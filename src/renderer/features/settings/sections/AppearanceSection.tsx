import { useStore } from "@/store";
import { THEMES } from "@/themes/themes";
import type { Density } from "@shared/types";
import { ThemeSwatch } from "../ThemeSwatch";
import { SectionHeading, SectionTitle } from "../Field";

const DENSITY_META: Record<Density, { label: string; sub: string }> = {
  compact: { label: "Compact", sub: "More info, less breathing room" },
  regular: { label: "Regular", sub: "Balanced — default" },
  comfy: { label: "Comfy", sub: "Larger targets, more whitespace" },
};

export function AppearanceSection() {
  const settings = useStore((s) => s.settings);
  const patchSettings = useStore((s) => s.patchSettings);

  return (
    <>
      <SectionTitle
        title="Appearance"
        sub="Colours, fonts and density. Synced across all windows."
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {(["Light", "Dark"] as const).map((group) => (
          <div key={group}>
            <div
              className="display"
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--ink-3)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              {group}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {THEMES.filter((t) => t.group === group).map((th) => (
                <ThemeSwatch
                  key={th.id}
                  theme={th}
                  active={settings.theme === th.id}
                  onClick={() => void patchSettings({ theme: th.id })}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20 }}>
        <SectionHeading>Density</SectionHeading>
        {(Object.keys(DENSITY_META) as Density[]).map((d) => {
          const meta = DENSITY_META[d];
          const sel = settings.density === d;
          return (
            <button
              key={d}
              onClick={() => void patchSettings({ density: d })}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 0",
                borderBottom: "1px solid var(--line)",
                width: "100%",
                background: "transparent",
                border: 0,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  border: `2px solid ${sel ? "var(--accent)" : "var(--ink-4)"}`,
                  background: sel ? "var(--accent)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {sel && (
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: "#fff",
                    }}
                  />
                )}
              </span>
              <div style={{ flex: 1, color: "var(--ink)" }}>
                <div style={{ fontSize: 13, fontWeight: sel ? 500 : 400 }}>
                  {meta.label}
                </div>
                <div className="ink-3" style={{ fontSize: 11, marginTop: 1 }}>
                  {meta.sub}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
