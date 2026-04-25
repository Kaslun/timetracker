import { BrowserWindow } from "electron";
import { exportCsv } from "../services/csv";
import { register } from "./handlers";

export function registerExports(): void {
  register("export:csv", async (input) => {
    const focused = BrowserWindow.getFocusedWindow();
    return exportCsv(input, focused ?? undefined);
  });
}
