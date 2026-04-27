import { useState } from "react";
import type { JSX } from "react";
import { GeneralSection } from "./sections/GeneralSection";
import { AppearanceSection } from "./sections/AppearanceSection";
import { NudgesSection } from "./sections/NudgesSection";
import { IntegrationsSection } from "./sections/IntegrationsSection";
import { ShortcutsSection } from "./sections/ShortcutsSection";
import { FocusSprintsSection } from "./sections/FocusSprintsSection";
import { DataExportSection } from "./sections/DataExportSection";
import { TitleBar } from "@/components";
import { rpc } from "@/lib/api";

const SECTIONS = [
  "General",
  "Appearance",
  "Nudges",
  "Focus sprints",
  "Integrations",
  "Shortcuts",
  "Data & export",
] as const;

type Section = (typeof SECTIONS)[number];

const RENDERERS: Record<Section, () => JSX.Element> = {
  General: () => <GeneralSection />,
  Appearance: () => <AppearanceSection />,
  Nudges: () => <NudgesSection />,
  "Focus sprints": () => <FocusSprintsSection />,
  Integrations: () => <IntegrationsSection />,
  Shortcuts: () => <ShortcutsSection />,
  "Data & export": () => <DataExportSection />,
};

export function SettingsRoot() {
  const [section, setSection] = useState<Section>("Appearance");
  const Renderer = RENDERERS[section];

  return (
    <div
      className="attensi window"
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      <TitleBar
        title="Attensi · Settings"
        onClose={() => void rpc("window:close")}
      />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <nav
          style={{
            width: 160,
            borderRight: "1px solid var(--line)",
            padding: "10px 0",
            background: "var(--bg)",
          }}
        >
          {SECTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setSection(s)}
              style={{
                display: "block",
                width: "100%",
                padding: "7px 16px",
                fontSize: 12,
                fontWeight: section === s ? 600 : 400,
                background: section === s ? "var(--surface)" : "transparent",
                borderLeft:
                  section === s
                    ? "2px solid var(--accent)"
                    : "2px solid transparent",
                cursor: "pointer",
                transition: "background 0.1s",
                textAlign: "left",
                color: "var(--ink)",
              }}
            >
              {s}
            </button>
          ))}
        </nav>
        <div
          className="scroll"
          style={{ flex: 1, padding: "20px 24px", overflow: "auto" }}
        >
          <Renderer />
        </div>
      </div>
    </div>
  );
}
