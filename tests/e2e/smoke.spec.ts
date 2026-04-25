/**
 * End-to-end smoke test for the packaged Electron app.
 *
 * Flow:
 *   1. Launch the app for the first time → intro modal appears
 *   2. Fill the display name → click "Get started"
 *   3. Start the first task from the expanded tasks tab
 *   4. Verify the pill shows "● running"
 *   5. Quit and relaunch
 *   6. Verify the same task is still running after restart
 *
 * Requires `npm run build` to have produced `out/main/index.js`.
 * The app's user-data directory is overridden via `ATTENSI_USERDATA_DIR` so the
 * test starts from a clean slate every time.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { _electron as electron, test } from "@playwright/test";

let userDataDir: string;

test.beforeEach(() => {
  userDataDir = mkdtempSync(join(tmpdir(), "attensi-e2e-"));
});

test.afterEach(() => {
  rmSync(userDataDir, { recursive: true, force: true });
});

test("first-run → start task → restart preserves task", async () => {
  const env = {
    ...process.env,
    ATTENSI_USERDATA_DIR: userDataDir,
    NODE_ENV: "test",
  };

  const app1 = await electron.launch({ args: ["out/main/index.js"], env });
  const intro = await app1.firstWindow();
  await intro.waitForSelector('input[placeholder="Marta"]');
  await intro.fill('input[placeholder="Marta"]', "E2E User");
  await intro.click('button:has-text("Get started")');

  const expanded = await app1.waitForEvent("window");
  await expanded.waitForSelector("text=Tasks");
  await expanded.click('button:has-text("Tasks")');
  await expanded.click(
    'table button:has-text("Start"), [data-testid="task-start"]:first-child',
  );

  const pill = (await app1.windows()).find((w) => w.url().includes("pill"));
  if (!pill) throw new Error("pill window not found after starting task");
  await pill.waitForSelector("text=● running, text=running");

  await app1.close();

  const app2 = await electron.launch({ args: ["out/main/index.js"], env });
  const pill2 = await app2.firstWindow();
  await pill2.waitForSelector("text=running");
  await app2.close();
});
