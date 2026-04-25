import { defineConfig } from "@playwright/test";

/**
 * Playwright launches the packaged Electron app via the helpers in the test.
 * Smoke tests live in `tests/e2e/`.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
});
