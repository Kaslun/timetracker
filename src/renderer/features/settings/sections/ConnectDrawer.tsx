import { useState, type CSSProperties, type FormEvent } from "react";
import type { IntegrationState } from "@shared/types";
import { Ic } from "@/components";
import { rpc } from "@/lib/api";

interface DrawerProps {
  initial: IntegrationState;
  onClose: () => void;
  onConnected: () => void;
}

const SCOPE_OPTIONS = [
  { id: "tasks", label: "Tasks & projects" },
  { id: "activity", label: "Activity for fill suggestions" },
  { id: "comments", label: "Post comments / status updates" },
];

/**
 * Modal-style connect drawer used by both the Settings → Integrations panel
 * and the first-run intro modal. Submitting calls the `integration:connect`
 * IPC; the registry takes care of validation, keychain writes, and DB seed.
 */
export function ConnectDrawer({ initial, onClose, onConnected }: DrawerProps) {
  const [token, setToken] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [scopes, setScopes] = useState<Set<string>>(
    () => new Set(["tasks", "activity"]),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const next = await rpc("integration:connect", {
      id: initial.id,
      token: token.trim(),
      workspace: workspace.trim() || null,
      scopes: [...scopes],
    });
    setSubmitting(false);
    if (next.status === "connected") {
      onConnected();
    } else if (next.status === "error") {
      setError(next.errorMessage ?? "Connection failed");
    }
  }

  function toggleScope(id: string): void {
    setScopes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "color-mix(in oklab, var(--ink) 30%, transparent)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => void submit(e)}
        style={{
          width: 440,
          maxWidth: "calc(100% - 32px)",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius)",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        }}
      >
        <header style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: initial.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
            }}
          >
            {initial.letter}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              Connect {initial.label}
            </div>
            <div className="ink-3" style={{ fontSize: 11 }}>
              {initial.meta}
            </div>
          </div>
          <button
            type="button"
            className="btn ghost icon"
            onClick={onClose}
            title="Cancel"
          >
            <Ic.Close s={12} />
          </button>
        </header>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 500 }}>API token</span>
          <input
            type="password"
            value={token}
            autoFocus
            onChange={(e) => setToken(e.target.value)}
            placeholder={tokenPlaceholderFor(initial.id)}
            style={inputStyle}
          />
          <span className="ink-3" style={{ fontSize: 10 }}>
            Stored in your OS keychain — never written to disk.
          </span>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 500 }}>
            Workspace <span className="ink-3">(optional)</span>
          </span>
          <input
            type="text"
            value={workspace}
            onChange={(e) => setWorkspace(e.target.value)}
            placeholder="e.g. attensi"
            style={inputStyle}
          />
        </label>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 500 }}>Scopes</span>
          {SCOPE_OPTIONS.map((s) => (
            <label
              key={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={scopes.has(s.id)}
                onChange={() => toggleScope(s.id)}
              />
              {s.label}
            </label>
          ))}
        </div>

        {error ? (
          <div
            style={{
              fontSize: 12,
              color: "var(--danger)",
              padding: "8px 10px",
              background: "color-mix(in oklab, var(--danger) 10%, transparent)",
              borderRadius: 6,
            }}
          >
            {error}
          </div>
        ) : null}

        <footer
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 8,
          }}
        >
          <button
            type="button"
            className="btn ghost"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn primary"
            disabled={submitting || token.trim().length === 0}
          >
            {submitting ? "Connecting…" : "Connect"}
          </button>
        </footer>
      </form>
    </div>
  );
}

const inputStyle: CSSProperties = {
  background: "var(--surface-2)",
  border: "1px solid var(--line)",
  borderRadius: 6,
  padding: "8px 10px",
  fontSize: 13,
  color: "var(--ink)",
  fontFamily: "var(--font-mono)",
};

function tokenPlaceholderFor(id: IntegrationState["id"]): string {
  switch (id) {
    case "linear":
      return "lin_api_…";
    case "jira":
      return "ATATT3xFf…";
    case "asana":
      return "1/123…:abc";
    case "slack":
      return "xoxb-…";
    case "teams":
      return "Bearer …";
    case "github":
      return "ghp_…";
    case "gcal":
      return "ya29.…";
    case "notion":
      return "secret_…";
  }
}
