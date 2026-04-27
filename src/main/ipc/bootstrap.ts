import { projects, tasks, entries, captures, settings } from "../db/repos";
import { getFillSuggestions } from "../services/fillSuggestions";
import { getProviderRegistry } from "../integrations/registry";
import { register } from "./handlers";

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

export function registerBootstrap(): void {
  register("app:bootstrap", () => {
    const since = Date.now() - TWO_WEEKS_MS;
    return {
      settings: settings.getAll(),
      current: entries.currentView(),
      tasks: tasks.listWithStats(),
      todayEntries: entries.list({ from: since }),
      captures: captures.list(),
      projects: projects.list(),
      fillSuggestions: getFillSuggestions(),
      integrations: getProviderRegistry().list(),
      platform:
        process.platform === "darwin"
          ? "mac"
          : process.platform === "linux"
            ? "linux"
            : "win",
    };
  });
}
