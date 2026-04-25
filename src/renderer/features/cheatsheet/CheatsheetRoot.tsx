import { useEffect } from "react";
import { SHORTCUTS, type ShortcutKey, shortcutLabel } from "@shared/hotkeys";
import { rpc } from "@/lib/api";

const ORDER: ShortcutKey[] = [
  "toggleTimer",
  "switchTask",
  "expandWindow",
  "brainDump",
  "cheatsheet",
];

export function CheatsheetRoot() {
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const isClose =
        e.key === "Escape" ||
        (e.ctrlKey && e.key === "/") ||
        (e.metaKey && e.key === "/");
      if (isClose) {
        e.preventDefault();
        void rpc("window:close");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="attensi" style={{ height: "100%", padding: 6 }}>
      <div
        className="card"
        style={{ width: "100%", height: "100%", padding: "20px 24px" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 18,
          }}
        >
          <div className="display" style={{ fontSize: 18, fontWeight: 500 }}>
            Keyboard shortcuts
          </div>
          <span className="kbd">{shortcutLabel("cheatsheet")}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {ORDER.map((key) => {
            const s = SHORTCUTS[key];
            return (
              <div
                key={key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 0",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <span style={{ fontSize: 13, flex: 1 }}>{s.label}</span>
                <span
                  className="mono"
                  style={{ fontSize: 12, color: "var(--ink-2)" }}
                >
                  {s.win}
                </span>
              </div>
            );
          })}
        </div>
        <div
          className="ink-3"
          style={{
            fontSize: 11,
            marginTop: 18,
            fontFamily: "var(--font-mono)",
          }}
        >
          Five shortcuts. Press <span className="kbd">Esc</span> or{" "}
          <span className="kbd">{shortcutLabel("cheatsheet")}</span> to close.
        </div>
      </div>
    </div>
  );
}
