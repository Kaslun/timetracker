import { useEffect, useState } from "react";
import { rpc, on } from "@/lib/api";
import { Ic } from "@/components";

interface UpdateInfo {
  current: string;
  latest: string | null;
  hasUpdate: boolean;
  url: string | null;
  notes: string | null;
  checkedAt: number;
  error: string | null;
}

const DISMISS_KEY = "attensi.update.dismissed";

/**
 * Non-blocking banner shown at the top of the expanded window when a newer
 * GitHub release is available. Persists "dismissed for this version" in
 * localStorage so we don't keep nagging across re-opens. Cleared as soon
 * as a newer-still version appears.
 */
export function UpdateBanner() {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    void rpc("update:check").then((u) => {
      if (u.hasUpdate) {
        const dismissed = localStorage.getItem(DISMISS_KEY);
        if (dismissed === u.latest) setHidden(true);
        setInfo(u);
      }
    });
    const off = on("update:available", (u) => {
      setInfo(u);
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed !== u.latest) setHidden(false);
    });
    return off;
  }, []);

  if (!info || !info.hasUpdate || hidden) return null;

  const onDownload = (): void => {
    void rpc("update:open");
  };

  const onDismiss = (): void => {
    if (info.latest) localStorage.setItem(DISMISS_KEY, info.latest);
    setHidden(true);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 16px",
        background: "color-mix(in oklab, var(--accent) 10%, var(--surface))",
        borderBottom: "1px solid var(--line-2)",
        fontSize: 12,
      }}
    >
      <Ic.Download s={14} style={{ color: "var(--accent)" }} />
      <span style={{ flex: 1, color: "var(--ink)" }}>
        Version{" "}
        <span className="mono" style={{ fontWeight: 600 }}>
          {info.latest}
        </span>{" "}
        is available <span className="ink-3">(you have {info.current})</span>
      </span>
      <button className="btn accent" onClick={onDownload}>
        Open release
      </button>
      <button
        className="btn ghost icon"
        title="Dismiss for this version"
        onClick={onDismiss}
      >
        <Ic.Close s={12} />
      </button>
    </div>
  );
}
