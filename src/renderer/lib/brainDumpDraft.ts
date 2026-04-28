/**
 * Persisted in-progress brain dump.
 *
 * The Inbox's textarea state is local-component state, but we need it to
 * survive a `quitWithDraftSave()` call: the user clicks the close button
 * mid-thought and we don't want their text to vanish.
 *
 * Strategy: write the draft to `localStorage` on every keystroke (cheap, sync,
 * survives full app shutdown), hydrate the textarea from there on mount.
 * Whoever owns the close button calls `flushDraftAsCapture()` right before
 * `app:quitNow` to materialise any in-flight text as a tagged capture.
 *
 * We deliberately don't go through Zustand or IPC for the live draft because:
 *   - localStorage gives us free durability without round-tripping main.
 *   - The textarea is the only source of truth — sync issues are a non-event.
 *   - The "save on quit" path is the one place that needs to read it from
 *     outside InboxTab, so the API surface stays small.
 */
import { rpc } from "@/lib/api";

const KEY = "attensi.brainDumpDraft";

export function getDraft(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function setDraft(value: string): void {
  try {
    if (value) localStorage.setItem(KEY, value);
    else localStorage.removeItem(KEY);
  } catch {
    // Ignore: private mode, quota, or storage disabled.
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Ignore.
  }
}

/**
 * If there's a non-empty draft, flush it as a capture tagged `"draft"` so the
 * user can find it later. Best-effort: failures are swallowed so the quit path
 * still proceeds. Returns whether anything was saved.
 */
export async function flushDraftAsCapture(): Promise<boolean> {
  const text = getDraft().trim();
  if (!text) return false;
  try {
    await rpc("capture:create", { text, tag: "draft" });
    clearDraft();
    return true;
  } catch {
    // Leave the draft in localStorage so a relaunch can recover it.
    return false;
  }
}
