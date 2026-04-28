import { useEffect } from "react";
import { SHORTCUTS, effectiveBinding, type ShortcutKey } from "@shared/hotkeys";
import { rpc } from "@/lib/api";
import { useStore } from "@/store";

const GLOBAL: ShortcutKey[] = ["toggleTimer", "brainDumpGlobal", "quitApp"];
const INAPP: ShortcutKey[] = [
  "toggleTimerLocal",
  "switchTask",
  "expandWindow",
  "brainDump",
  "cheatsheet",
];

export function CheatsheetRoot() {
  // Pulled live so rebindings made in Settings show up the next time the user
  // opens the sheet without a relaunch.
  const overrides = useStore((s) => s.settings.shortcutOverrides) as Record<
    string,
    { combo: string }
  >;
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const isClose = e.key === "Escape" || e.key === "/";
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
        style={{ width: "100%", height: "100%", padding: "24px 24px" }}
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
          <span className="kbd">/</span>
        </div>

        <ShortcutGroup
          title="Global"
          subtitle="Work anywhere"
          keys={GLOBAL}
          overrides={overrides}
        />
        <ShortcutGroup
          title="In-app"
          subtitle="Single-key — disabled while typing"
          keys={INAPP}
          overrides={overrides}
        />

        <div
          className="ink-3"
          style={{
            fontSize: 11,
            marginTop: 18,
            fontFamily: "var(--font-mono)",
          }}
        >
          Press <span className="kbd">Esc</span> or{" "}
          <span className="kbd">/</span> to close.
        </div>
      </div>
    </div>
  );
}

function ShortcutGroup({
  title,
  subtitle,
  keys,
  overrides,
}: {
  title: string;
  subtitle: string;
  keys: ShortcutKey[];
  overrides: Record<string, { combo: string }>;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          marginBottom: 4,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--ink-2)",
          }}
        >
          {title}
        </div>
        <div className="ink-3" style={{ fontSize: 11 }}>
          {subtitle}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {keys.map((key) => {
          const s = SHORTCUTS[key];
          const combo = effectiveBinding(key, overrides);
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
                className="mono kbd"
                style={{ fontSize: 11, color: "var(--ink-2)" }}
              >
                {combo}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
