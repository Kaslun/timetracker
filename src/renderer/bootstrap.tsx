import { useEffect } from "react";
import { useStore, wireGlobalSubscriptions } from "@/store";
import { windowKind } from "@/lib/api";
import { MorphRoot } from "@/features/morph/MorphRoot";
import { ExpandedRoot } from "@/features/expanded/ExpandedRoot";
import { DashboardRoot } from "@/features/dashboard/DashboardRoot";
import { IntroRoot } from "@/features/intro/IntroRoot";
import { ToastRoot } from "@/features/toast/ToastRoot";
import { SettingsRoot } from "@/features/settings/SettingsRoot";
import { CheatsheetRoot } from "@/features/cheatsheet/CheatsheetRoot";
import { IntegrationRoot } from "@/features/integration/IntegrationRoot";

const TRANSPARENT_WINDOWS = new Set(["pill", "toast", "cheatsheet"]);

export function Bootstrap() {
  const ready = useStore((s) => s.ready);
  const kind = windowKind();

  useEffect(() => {
    if (TRANSPARENT_WINDOWS.has(kind)) {
      document.body.classList.add("transparent");
      document.documentElement.style.background = "transparent";
    }
    wireGlobalSubscriptions();
    void useStore.getState().bootstrap();
  }, [kind]);

  if (!ready) {
    return (
      <div className="attensi" style={{ padding: 24, color: "var(--ink-3)" }}>
        Loading…
      </div>
    );
  }

  switch (kind) {
    case "pill":
      return <MorphRoot />;
    case "expanded":
      // Legacy: the standalone expanded window is no longer opened, but the
      // route stays so any existing links resolve to a usable surface.
      return <ExpandedRoot />;
    case "dashboard":
      return <DashboardRoot />;
    case "intro":
      return <IntroRoot />;
    case "toast":
      return <ToastRoot />;
    case "settings":
      return <SettingsRoot />;
    case "cheatsheet":
      return <CheatsheetRoot />;
    case "integration":
      return <IntegrationRoot />;
    default:
      return <ExpandedRoot />;
  }
}
