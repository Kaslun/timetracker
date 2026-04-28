/**
 * Settings → Shortcuts.
 *
 * Every shortcut is rebindable. Capture flow:
 *   1. Click `Edit` on a row → row enters capture mode with "Press a key…"
 *   2. Listen on `keydown`. Once a non-modifier key arrives, build the combo
 *      (Ctrl/Shift/Alt/Meta + main key) via `comboFromEvent` and preview it.
 *   3. `Save` confirms; `Cancel` or `Esc` aborts. `Enter` also confirms when
 *      a candidate is captured (otherwise it's treated as the candidate).
 *
 * Validation lives in `validateBinding` (shared with the main process):
 *   - Globals must include Ctrl/Cmd + a main key.
 *   - In-app shortcuts can be single-key.
 *   - OS-reserved combos (Alt+F4, Ctrl+Alt+Del, Win+L, Meta+Tab, …) are
 *     rejected with a clear message.
 *   - Conflicts with another binding are flagged and the user can swap or
 *     pick a different combo.
 *
 * `Reset to defaults` clears every override; per-row reset clears just that
 * row. Persistence goes through `settings.shortcutOverrides`; the main
 * process re-registers `globalShortcut` whenever that key changes.
 */
import { useEffect, useState } from "react";
import {
  SHORTCUTS,
  SHORTCUT_KEYS,
  comboFromEvent,
  effectiveBinding,
  validateBinding,
  type ShortcutKey,
} from "@shared/hotkeys";
import { useStore } from "@/store";
import { rpc } from "@/lib/api";
import { SectionHeading, SectionTitle } from "../Field";

type Overrides = Record<string, { combo: string }>;

export function ShortcutsSection() {
  const overrides = useStore(
    (s) => s.settings.shortcutOverrides,
  ) as Overrides;
  const [editing, setEditing] = useState<ShortcutKey | null>(null);

  const save = (overrides: Overrides): Promise<unknown> =>
    rpc("settings:patch", { shortcutOverrides: overrides });

  const onResetAll = (): void => {
    if (!window.confirm("Reset every shortcut to its default binding?"))
      return;
    void save({});
  };

  const onResetOne = (key: ShortcutKey): void => {
    const next: Overrides = { ...overrides };
    delete next[key];
    void save(next);
  };

  const onCommit = async (
    key: ShortcutKey,
    combo: string,
    swap?: ShortcutKey,
  ): Promise<void> => {
    const next: Overrides = { ...overrides };
    if (swap) {
      // Swapping: clear the other binding so it falls back to default OR
      // assign it to the displaced combo (the previous binding of `key`).
      const previous = effectiveBinding(key, overrides);
      next[swap] = { combo: previous };
    }
    next[key] = { combo };
    await save(next);
    setEditing(null);
  };

  const globals = SHORTCUT_KEYS.filter((k) => SHORTCUTS[k].scope === "global");
  const inapp = SHORTCUT_KEYS.filter((k) => SHORTCUTS[k].scope === "inapp");

  return (
    <>
      <SectionTitle
        title="Shortcuts"
        sub="Every binding is editable. Globals work anywhere; in-app keys only fire when an Attensi window is focused and you're not typing."
      />
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="btn" onClick={onResetAll}>
          Reset all to defaults
        </button>
      </div>
      <SectionHeading>Global</SectionHeading>
      {globals.map((key) => (
        <ShortcutRow
          key={key}
          shortcutKey={key}
          overrides={overrides}
          editing={editing === key}
          onStart={() => setEditing(key)}
          onCancel={() => setEditing(null)}
          onCommit={(combo, swap) => void onCommit(key, combo, swap)}
          onReset={() => onResetOne(key)}
        />
      ))}
      <SectionHeading>In-app</SectionHeading>
      {inapp.map((key) => (
        <ShortcutRow
          key={key}
          shortcutKey={key}
          overrides={overrides}
          editing={editing === key}
          onStart={() => setEditing(key)}
          onCancel={() => setEditing(null)}
          onCommit={(combo, swap) => void onCommit(key, combo, swap)}
          onReset={() => onResetOne(key)}
        />
      ))}
    </>
  );
}

interface RowProps {
  shortcutKey: ShortcutKey;
  overrides: Overrides;
  editing: boolean;
  onStart: () => void;
  onCancel: () => void;
  onCommit: (combo: string, swap?: ShortcutKey) => void;
  onReset: () => void;
}

function ShortcutRow({
  shortcutKey,
  overrides,
  editing,
  onStart,
  onCancel,
  onCommit,
  onReset,
}: RowProps) {
  const sc = SHORTCUTS[shortcutKey];
  const current = effectiveBinding(shortcutKey, overrides);
  const isOverridden = !!overrides[shortcutKey];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 0",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{sc.label}</div>
        {isOverridden ? (
          <div className="ink-3" style={{ fontSize: 10, marginTop: 2 }}>
            Overridden — default {sc.win}
          </div>
        ) : null}
      </div>
      {editing ? (
        <Capture
          shortcutKey={shortcutKey}
          overrides={overrides}
          onCancel={onCancel}
          onCommit={onCommit}
        />
      ) : (
        <>
          <Combo combo={current} />
          <button className="btn" onClick={onStart}>
            Edit
          </button>
          <button
            className="btn ghost icon"
            title="Reset to default"
            disabled={!isOverridden}
            onClick={onReset}
            style={{ width: 26, height: 26 }}
          >
            ↺
          </button>
        </>
      )}
    </div>
  );
}

function Combo({ combo }: { combo: string }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {combo.split("+").map((part, i) => (
        <span key={i} className="kbd mono" style={{ fontSize: 11 }}>
          {part}
        </span>
      ))}
    </div>
  );
}

interface CaptureProps {
  shortcutKey: ShortcutKey;
  overrides: Overrides;
  onCancel: () => void;
  onCommit: (combo: string, swap?: ShortcutKey) => void;
}

function Capture({
  shortcutKey,
  overrides,
  onCancel,
  onCommit,
}: CaptureProps) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{ key: ShortcutKey } | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === "Escape") {
        onCancel();
        return;
      }
      // Enter without a candidate is treated as commit-if-valid; with no
      // candidate yet it's a no-op.
      if (e.key === "Enter") {
        if (pending) commit(pending);
        return;
      }

      const combo = comboFromEvent(e);
      if (!combo) return; // modifier-only — keep waiting for the main key
      const result = validateBinding(shortcutKey, combo, overrides);
      setPending(combo);
      if (!result.ok) {
        setError(result.reason ?? "Invalid binding.");
        setConflict(result.conflict ? { key: result.conflict.key } : null);
      } else {
        setError(null);
        setConflict(null);
      }
    };
    window.addEventListener("keydown", handler, { capture: true });
    return () =>
      window.removeEventListener("keydown", handler, { capture: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, shortcutKey, overrides]);

  const commit = (combo: string, swap?: ShortcutKey): void => {
    const result = validateBinding(shortcutKey, combo, overrides);
    if (!result.ok && !swap) {
      setError(result.reason ?? "Invalid binding.");
      return;
    }
    onCommit(combo, swap);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
        justifyContent: "flex-end",
      }}
    >
      {pending ? (
        <Combo combo={pending} />
      ) : (
        <span className="ink-3" style={{ fontSize: 11 }}>
          Press a key…
        </span>
      )}
      {error ? (
        <span style={{ fontSize: 10, color: "var(--danger)" }}>{error}</span>
      ) : null}
      {conflict && pending ? (
        <button
          className="btn"
          title="Swap with the conflicting binding"
          onClick={() => commit(pending, conflict.key)}
        >
          Swap
        </button>
      ) : null}
      <button
        className="btn primary"
        disabled={!pending || !!error}
        onClick={() => pending && commit(pending)}
      >
        Save
      </button>
      <button className="btn" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
