import { SHORTCUTS, type ShortcutKey } from "@shared/hotkeys";
import { SectionTitle } from "../Field";

const ORDER: ShortcutKey[] = [
  "toggleTimer",
  "switchTask",
  "expandWindow",
  "brainDump",
  "cheatsheet",
];

export function ShortcutsSection() {
  return (
    <>
      <SectionTitle
        title="Shortcuts"
        sub="Global shortcuts work even when the app is hidden."
      />
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
                padding: "8px 0",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <span style={{ fontSize: 13, flex: 1 }}>{s.label}</span>
              <span
                className="mono kbd"
                style={{ fontSize: 11, color: "var(--ink-2)" }}
              >
                {s.win}
              </span>
            </div>
          );
        })}
        <div className="ink-3" style={{ fontSize: 11, marginTop: 12 }}>
          Five shortcuts. Global shortcuts work even when another app has focus.
        </div>
      </div>
    </>
  );
}
