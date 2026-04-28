import {
  cancelQuit,
  getCachedSummary,
  quitNow,
  requestQuit,
} from "../services/quit";
import { setShortcutsSuspended } from "../services/shortcuts";
import {
  checkForUpdate,
  installUpdate,
  openLatestRelease,
} from "../services/updater";
import {
  disconnectAllIntegrations,
  wipeLocalData,
} from "../services/wipe";
import { register } from "./handlers";

export function registerApp(): void {
  register("app:requestQuit", () => {
    requestQuit();
  });
  register("app:quitNow", () => {
    quitNow();
  });
  register("app:cancelQuit", () => {
    cancelQuit();
  });
  register("app:wipeLocalData", () => wipeLocalData());
  register("app:disconnectAllIntegrations", async () =>
    disconnectAllIntegrations(),
  );
  register("eod:summary", () => getCachedSummary());

  register("update:check", async () => checkForUpdate());
  register("update:open", () => {
    openLatestRelease();
  });
  register("update:install", async () => {
    await installUpdate();
  });

  register("shortcuts:setSuspended", ({ suspended }) => {
    setShortcutsSuspended(suspended);
  });
}
