import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

const r = (p: string): string => resolve(__dirname, p);

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/main",
      rollupOptions: {
        input: { index: r("src/main/index.ts") },
      },
    },
    resolve: {
      alias: {
        "@shared": r("src/shared"),
        "@main": r("src/main"),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/preload",
      rollupOptions: {
        input: { index: r("src/main/preload.ts") },
      },
    },
    resolve: {
      alias: {
        "@shared": r("src/shared"),
      },
    },
  },
  renderer: {
    root: r("src/renderer"),
    plugins: [react()],
    resolve: {
      alias: {
        "@": r("src/renderer"),
        "@shared": r("src/shared"),
      },
    },
    build: {
      outDir: r("out/renderer"),
      rollupOptions: {
        input: { index: r("src/renderer/index.html") },
      },
    },
    server: {
      port: 5173,
    },
  },
});
