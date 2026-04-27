/**
 * Lightweight self-update check.
 *
 * We don't ship a code-signed installer yet, so `electron-updater` is not
 * configured. Instead we ping the GitHub Releases API on app start and
 * (optionally) on user request, compare the latest tag with our package
 * version, and surface a non-blocking banner if there's a newer build.
 * One-click "open update" launches the release URL in the default browser.
 */
import { app, shell } from "electron";
import { broadcast } from "../ipc/events";
import { logger } from "./logger";

const RELEASES_API =
  "https://api.github.com/repos/attensi/timetracker/releases/latest";
const RELEASES_HTML = "https://github.com/attensi/timetracker/releases/latest";

const log = logger("updater");

export interface UpdateInfo {
  current: string;
  latest: string | null;
  hasUpdate: boolean;
  url: string | null;
  notes: string | null;
  checkedAt: number;
  error: string | null;
}

let cached: UpdateInfo | null = null;
let inflight: Promise<UpdateInfo> | null = null;

function stripTag(tag: string): string {
  return tag.replace(/^v/i, "").trim();
}

/**
 * Compare two semver-like strings. Returns 1 / 0 / -1.
 *
 * Tolerant of pre-release suffixes (`1.2.3-beta.1`) — we treat any version
 * with a suffix as "older than" the equivalent clean release, matching what
 * users typically expect from a release feed.
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const splitA = a.split("-");
  const splitB = b.split("-");
  const baseA = splitA[0].split(".").map((n) => parseInt(n, 10) || 0);
  const baseB = splitB[0].split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(baseA.length, baseB.length); i++) {
    const x = baseA[i] ?? 0;
    const y = baseB[i] ?? 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  if (splitA[1] && !splitB[1]) return -1;
  if (!splitA[1] && splitB[1]) return 1;
  return 0;
}

interface GithubRelease {
  tag_name?: string;
  html_url?: string;
  body?: string;
}

export async function checkForUpdate(): Promise<UpdateInfo> {
  if (inflight) return inflight;
  inflight = (async () => {
    const current = app.getVersion();
    try {
      const res = await fetch(RELEASES_API, {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as GithubRelease;
      const latestTag = data.tag_name ? stripTag(data.tag_name) : null;
      const hasUpdate =
        !!latestTag && compareVersions(latestTag, current) === 1;
      cached = {
        current,
        latest: latestTag,
        hasUpdate,
        url: data.html_url ?? RELEASES_HTML,
        notes: data.body ?? null,
        checkedAt: Date.now(),
        error: null,
      };
      if (hasUpdate) broadcast("update:available", cached);
      return cached;
    } catch (err) {
      log.warn("update check failed", err);
      cached = {
        current,
        latest: null,
        hasUpdate: false,
        url: RELEASES_HTML,
        notes: null,
        checkedAt: Date.now(),
        error: err instanceof Error ? err.message : String(err),
      };
      return cached;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function getCachedUpdate(): UpdateInfo | null {
  return cached;
}

export function openLatestRelease(): void {
  void shell.openExternal(cached?.url ?? RELEASES_HTML);
}
