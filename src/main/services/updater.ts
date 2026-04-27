/**
 * Self-update service.
 *
 * Flow:
 *   1. `checkForUpdate()` queries GitHub Releases API and (when running on
 *      Windows from an installed NSIS build) records the URL of the
 *      `*-setup.exe` asset.
 *   2. `installUpdate()` downloads that installer to a temp dir, broadcasts
 *      progress, then spawns the installer detached and quits the app.
 *      NSIS handles closing/replacing the old install and relaunching.
 *   3. `openLatestRelease()` is the fallback for environments where in-app
 *      install isn't safe (dev, portable .exe, non-Windows).
 *
 * Repo coordinates are read from `package.json#repository.url` so forks
 * don't 404 the way a hardcoded slug would.
 */
import { spawn } from "node:child_process";
import { createWriteStream, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { app, shell } from "electron";
import { broadcast } from "../ipc/events";
import { logger } from "./logger";

const log = logger("updater");

interface RepoCoords {
  owner: string;
  name: string;
}

/** Parse "git+https://github.com/<owner>/<name>.git" → {owner,name}. */
function parseRepoUrl(url: string): RepoCoords | null {
  const m = url.match(/github\.com[/:]([^/]+)\/([^/.]+?)(?:\.git)?\/?$/i);
  if (!m) return null;
  return { owner: m[1], name: m[2] };
}

function loadRepoCoords(): RepoCoords {
  // app.getAppPath() points at the asar root in production and the project
  // root in dev; package.json sits at both.
  try {
    const pkgPath = join(app.getAppPath(), "package.json");
    const raw = readFileSync(pkgPath, "utf8");
    const pkg = JSON.parse(raw) as { repository?: { url?: string } | string };
    const url =
      typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url;
    const parsed = url ? parseRepoUrl(url) : null;
    if (parsed) return parsed;
  } catch (err) {
    log.warn("failed to read repository from package.json", err);
  }
  return { owner: "Kaslun", name: "timetracker" };
}

const REPO = loadRepoCoords();
const RELEASES_API = `https://api.github.com/repos/${REPO.owner}/${REPO.name}/releases/latest`;
const RELEASES_HTML = `https://github.com/${REPO.owner}/${REPO.name}/releases/latest`;

export interface UpdateInfo {
  current: string;
  latest: string | null;
  hasUpdate: boolean;
  /** Release page URL — used by `openLatestRelease()`. */
  url: string | null;
  /** Direct download URL of the NSIS `*-setup.exe` asset, if available. */
  installerUrl: string | null;
  notes: string | null;
  checkedAt: number;
  error: string | null;
  /**
   * True when we can safely download + run the installer ourselves.
   * False in dev, portable mode, non-Windows, or when no NSIS asset exists.
   */
  canAutoInstall: boolean;
  /** Download progress 0..1, or null when not downloading. */
  downloadProgress: number | null;
  /** True after the installer has been queued to run; the app will quit. */
  downloaded: boolean;
}

let cached: UpdateInfo | null = null;
let inflight: Promise<UpdateInfo> | null = null;
let installInflight: Promise<void> | null = null;

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

/**
 * True when this process can launch the installer in place of itself —
 * i.e. it's a packaged Windows NSIS install (not dev, not portable).
 */
function isAutoInstallEnvironment(): boolean {
  if (process.platform !== "win32") return false;
  if (!app.isPackaged) return false;
  // electron-builder sets PORTABLE_EXECUTABLE_FILE for portable runs.
  if (process.env.PORTABLE_EXECUTABLE_FILE) return false;
  return true;
}

interface GithubAsset {
  name?: string;
  browser_download_url?: string;
}

interface GithubRelease {
  tag_name?: string;
  html_url?: string;
  body?: string;
  assets?: GithubAsset[];
}

/** Pick the NSIS setup .exe asset from a release. */
function pickInstallerUrl(assets: GithubAsset[] | undefined): string | null {
  if (!assets) return null;
  const setup = assets.find(
    (a) => a.name && /setup\.exe$/i.test(a.name) && a.browser_download_url,
  );
  return setup?.browser_download_url ?? null;
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
        if (res.status === 404) {
          throw new Error(
            `No releases found for ${REPO.owner}/${REPO.name} (HTTP 404). ` +
              `Verify repository.url in package.json or publish a release.`,
          );
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as GithubRelease;
      const latestTag = data.tag_name ? stripTag(data.tag_name) : null;
      const hasUpdate =
        !!latestTag && compareVersions(latestTag, current) === 1;
      const installerUrl = pickInstallerUrl(data.assets);
      const autoInstallEnv = isAutoInstallEnvironment();
      cached = {
        current,
        latest: latestTag,
        hasUpdate,
        url: data.html_url ?? RELEASES_HTML,
        installerUrl,
        notes: data.body ?? null,
        checkedAt: Date.now(),
        error: null,
        canAutoInstall: hasUpdate && !!installerUrl && autoInstallEnv,
        downloadProgress: null,
        downloaded: false,
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
        installerUrl: null,
        notes: null,
        checkedAt: Date.now(),
        error: err instanceof Error ? err.message : String(err),
        canAutoInstall: false,
        downloadProgress: null,
        downloaded: false,
      };
      return cached;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/**
 * Download the latest installer with progress, then spawn it detached and
 * quit the running app. NSIS handles replacing files and relaunching.
 *
 * Falls back to opening the release page when the environment can't safely
 * auto-install (dev / portable / non-Windows / no NSIS asset).
 */
export async function installUpdate(): Promise<void> {
  if (installInflight) return installInflight;
  installInflight = (async () => {
    if (!cached || !cached.installerUrl || !cached.canAutoInstall) {
      openLatestRelease();
      return;
    }

    const url = cached.installerUrl;
    const fileName = url.split("/").pop() ?? "AttensiTimeTracker-setup.exe";
    const dir = join(tmpdir(), "attensi-update");
    mkdirSync(dir, { recursive: true });
    const dest = join(dir, fileName);

    cached = { ...cached, downloadProgress: 0, downloaded: false, error: null };
    broadcast("update:state", cached);

    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const total = Number(res.headers.get("content-length") ?? 0);
      const writer = createWriteStream(dest);
      const reader = res.body.getReader();
      let received = 0;
      let lastBroadcast = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        writer.write(value);
        received += value.byteLength;
        const now = Date.now();
        // Throttle progress broadcasts to ~4 Hz so we don't flood IPC.
        if (total > 0 && now - lastBroadcast > 250) {
          cached = { ...cached, downloadProgress: received / total };
          broadcast("update:state", cached);
          lastBroadcast = now;
        }
      }
      await new Promise<void>((resolve, reject) => {
        writer.end((err: Error | null | undefined) => {
          if (err) reject(err);
          else resolve();
        });
      });

      cached = { ...cached, downloadProgress: 1, downloaded: true };
      broadcast("update:state", cached);
      log.info("installer downloaded", { path: dest, bytes: received });

      // Detach so the installer survives this process exit.
      const child = spawn(dest, [], { detached: true, stdio: "ignore" });
      child.unref();

      // Give the installer a beat to spawn before we quit.
      setTimeout(() => app.quit(), 200);
    } catch (err) {
      log.warn("update install failed", err);
      cached = {
        ...cached,
        downloadProgress: null,
        downloaded: false,
        error: err instanceof Error ? err.message : String(err),
      };
      broadcast("update:state", cached);
      throw err;
    }
  })();
  try {
    await installInflight;
  } finally {
    installInflight = null;
  }
}

export function getCachedUpdate(): UpdateInfo | null {
  return cached;
}

export function openLatestRelease(): void {
  void shell.openExternal(cached?.url ?? RELEASES_HTML);
}
