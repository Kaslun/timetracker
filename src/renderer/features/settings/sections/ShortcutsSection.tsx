import { SHORTCUTS, type ShortcutKey } from "@shared/hotkeys";
import { SectionTitle } from "../Field";

const GLOBAL: ShortcutKey[] = ["toggleTimer", "brainDumpGlobal"];
const INAPP: ShortcutKey[] = [
  "toggleTimerLocal",
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
        sub="Two global shortcuts that work anywhere, five single-key in-app keys."
      />
      <Group title="Global" subtitle="Anywhere on your machine" keys={GLOBAL} />
      <Group
        title="In-app"
        subtitle="Single-key — disabled while typing in inputs"
        keys={INAPP}
      />
    </>
  );
}

function Group({
  title,
  subtitle,
  keys,
}: {
  title: string;
  subtitle: string;
  keys: ShortcutKey[];
}) {
  return (
    <div style={{ marginTop: 16 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--ink-2)",
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      <div className="ink-3" style={{ fontSize: 11, marginBottom: 8 }}>
        {subtitle}
      </div>
      {keys.map((key) => {
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
    </div>
  );
}
