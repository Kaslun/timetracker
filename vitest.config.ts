import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const r = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@shared": r("./src/shared"),
      "@main": r("./src/main"),
      "@": r("./src/renderer"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/renderer/lib/**", "src/shared/**"],
      // api.ts requires window.attensi (Electron IPC bridge) — not unit-testable.
      // types.ts contains only interface/type declarations — no runtime code.
      exclude: ["src/renderer/lib/api.ts", "src/shared/types.ts"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
});
