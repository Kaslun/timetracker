import { useEffect, useState } from "react";
import type { JSX } from "react";
import { GeneralSection } from "./sections/GeneralSection";
import { AppearanceSection } from "./sections/AppearanceSection";
import { NudgesSection } from "./sections/NudgesSection";
import { IntegrationsSection } from "./sections/IntegrationsSection";
import { ShortcutsSection } from "./sections/ShortcutsSection";
import { FocusSprintsSection } from "./sections/FocusSprintsSection";
import { DataExportSection } from "./sections/DataExportSection";
import { TitleBar } from "@/components";
import { on, rpc, settingsSection } from "@/lib/api";
import { useContainerWidth } from "@/lib/useContainerWidth";

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

/** Maps the IPC schema's slug values back to display labels. */
const SECTION_BY_SLUG: Record<string, Section> = {
  general: "General",
  appearance: "Appearance",
  nudges: "Nudges",
  "focus-sprints": "Focus sprints",
  integrations: "Integrations",
  shortcuts: "Shortcuts",
  "data-export": "Data & export",
};

function resolveInitialSection(initial: string | null | undefined): Section {
  if (initial && SECTION_BY_SLUG[initial]) return SECTION_BY_SLUG[initial];
  return "General";
}

interface SettingsPanelProps {
  /** Slug of the section to land on. Defaults to `"general"`. */
  initialSection?: string | null;
}

const RENDERERS: Record<Section, () => JSX.Element> = {
  General: () => <GeneralSection />,
  Appearance: () => <AppearanceSection />,
  Nudges: () => <NudgesSection />,
  "Focus sprints": () => <FocusSprintsSection />,
  Integrations: () => <IntegrationsSection />,
  Shortcuts: () => <ShortcutsSection />,
  "Data & export": () => <DataExportSection />,
};

/**
 * Settings window root. Honours `initialSection` (passed from the URL via the
 * preload, or as a prop in tests) and listens for live `settings:section`
 * pushes from the main process when the cog is clicked again on an already-
 * open window.
 */
export function SettingsRoot({ initialSection }: SettingsPanelProps = {}) {
  const seed = initialSection ?? settingsSection();
  const [section, setSection] = useState<Section>(resolveInitialSection(seed));
  const Renderer = RENDERERS[section];
  const { ref, breakpoint } = useContainerWidth<HTMLDivElement>();

  useEffect(() => {
    return on("settings:section", (slug) => {
      setSection(resolveInitialSection(slug));
    });
  }, []);

  return (
    <div
      ref={ref}
      className={`attensi window bp-${breakpoint}`}
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      <TitleBar
        title="Attensi · Settings"
        onClose={() => void rpc("window:close")}
      />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <nav
          // Compact width: collapse the sidebar to a thinner nav with shorter
          // labels; otherwise keep the original 160px column.
          style={{
            width: breakpoint === "compact" ? 96 : 160,
            borderRight: "1px solid var(--line)",
            padding: "10px 0",
            background: "var(--bg)",
            flexShrink: 0,
          }}
        >
          {SECTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setSection(s)}
              title={s}
              style={{
                display: "block",
                width: "100%",
                padding: breakpoint === "compact" ? "7px 10px" : "7px 16px",
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
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {s}
            </button>
          ))}
        </nav>
        <div
          className="scroll"
          style={{
            flex: 1,
            padding: breakpoint === "compact" ? "16px" : "20px 24px",
            overflow: "auto",
          }}
        >
          <Renderer />
        </div>
      </div>
    </div>
  );
}
