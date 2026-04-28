import { settings } from "../db/repos";
import { setAutoLaunch } from "../services/autolaunch";
import { rebuildMenu as rebuildTrayMenu } from "../services/tray";
import { reapplyGlobalShortcuts } from "../services/shortcuts";
import { buildAppMenu } from "../services/menu";
import { broadcastChanges } from "./broadcast";
import { register } from "./handlers";

export function registerSettings(): void {
  register("settings:get", () => settings.getAll());
  register("settings:patch", (patch) => {
    const next = settings.patch(patch);
    if (patch.autoLaunch !== undefined) setAutoLaunch(patch.autoLaunch);
    if (patch.shortcutOverrides !== undefined) {
      reapplyGlobalShortcuts();
      buildAppMenu();
    }
    broadcastChanges({ settings: true });
    rebuildTrayMenu();
    return next;
  });

  register("autoLaunch:set", ({ enabled }) => {
    setAutoLaunch(enabled);
    settings.patch({ autoLaunch: enabled });
    broadcastChanges({ settings: true });
    rebuildTrayMenu();
  });
}
