import { useEffect, useState } from "react";
import { rpc, on } from "@/lib/api";
import { Ic } from "@/components";

interface UpdateInfo {
  current: string;
  latest: string | null;
  hasUpdate: boolean;
  url: string | null;
  installerUrl: string | null;
  notes: string | null;
  checkedAt: number;
  error: string | null;
  canAutoInstall: boolean;
  downloadProgress: number | null;
  downloaded: boolean;
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
    const offAvail = on("update:available", (u) => {
      setInfo(u);
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed !== u.latest) setHidden(false);
    });
    const offState = on("update:state", (u) => setInfo(u));
    return () => {
      offAvail();
      offState();
    };
  }, []);

  if (!info || !info.hasUpdate || hidden) return null;

  const isDownloading = info.downloadProgress !== null && !info.downloaded;
  const updateLabel = isDownloading
    ? `Downloading… ${Math.round((info.downloadProgress ?? 0) * 100)}%`
    : info.canAutoInstall
      ? "Update"
      : "Open release";

  const onUpdate = (): void => {
    if (info.canAutoInstall) void rpc("update:install");
    else void rpc("update:open");
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
      <button
        className="btn accent"
        onClick={onUpdate}
        disabled={isDownloading}
      >
        {updateLabel}
      </button>
      <button
        className="btn ghost icon"
        title="Dismiss for this version"
        onClick={onDismiss}
        disabled={isDownloading}
      >
        <Ic.Close s={12} />
      </button>
    </div>
  );
}
