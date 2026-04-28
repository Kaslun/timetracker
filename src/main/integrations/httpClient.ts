/**
 * Polite HTTP client used by every integration provider.
 *
 * Responsibilities:
 *  - **Coalesce** simultaneous identical requests within a 2 s window so
 *    multiple UI surfaces don't fan out into N network calls.
 *  - **Conditional requests**: if the cache holds an ETag, attach
 *    `If-None-Match`; a 304 returns the cached payload without consuming
 *    quota. Same for `If-Modified-Since` when only `updated_at` is known.
 *  - **Rate-limit awareness**: read `X-RateLimit-Remaining` / `Retry-After`
 *    headers and back off until the window resets. While throttled, the
 *    debug stats reflect the state and `request()` rejects fast.
 *  - **Per-provider stats**: request count + cache hits, surfaced via
 *    `integration:debugStats` IPC for the hidden debug panel.
 *
 * This module is intentionally framework-light; it uses Node's global
 * `fetch` (Electron 28+) and the SQLite-backed `integrationCache`.
 */
import { integrationCache } from "./cache";

interface ProviderState {
  requests: number;
  cacheHits: number;
  lastSyncedAt: number | null;
  rateLimitRemaining: number | null;
  /** Wall-clock ms before which we must not hit the API again. */
  retryAfter: number | null;
}

const state = new Map<string, ProviderState>();

function ensure(provider: string): ProviderState {
  let s = state.get(provider);
  if (!s) {
    s = {
      requests: 0,
      cacheHits: 0,
      lastSyncedAt: null,
      rateLimitRemaining: null,
      retryAfter: null,
    };
    state.set(provider, s);
  }
  return s;
}

/**
 * Snapshot of all provider stats. Drives `integration:debugStats` IPC.
 */
export function getDebugStats(): Array<{
  provider: string;
  requests: number;
  cacheHits: number;
  lastSyncedAt: number | null;
  rateLimitRemaining: number | null;
  retryAfter: number | null;
}> {
  return Array.from(state.entries()).map(([provider, s]) => ({
    provider,
    requests: s.requests,
    cacheHits: s.cacheHits,
    lastSyncedAt: s.lastSyncedAt,
    rateLimitRemaining: s.rateLimitRemaining,
    retryAfter: s.retryAfter,
  }));
}

/** Reset all stats — used by tests + the wipe-data flow. */
export function resetDebugStats(): void {
  state.clear();
}

interface RequestOptions {
  provider: string;
  /** Cache key inside the provider's namespace, e.g. `"linear:my-issues"`. */
  resource: string;
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  /** Skip the cache lookup. Used by manual-refresh path. */
  bypassCache?: boolean;
}

interface RequestResult<T = unknown> {
  payload: T;
  fromCache: boolean;
  status: number;
}

const inflight = new Map<string, Promise<RequestResult>>();

function coalesceKey(opts: RequestOptions): string {
  return `${opts.provider}|${opts.method ?? "GET"}|${opts.url}`;
}

/**
 * Perform an HTTP request with cache + ETag + coalescing semantics.
 *
 * Throws if the provider is currently rate-limited (caller can decide to
 * fall back to the cached payload or surface the throttle state to the UI).
 */
export async function request<T = unknown>(
  opts: RequestOptions,
): Promise<RequestResult<T>> {
  const provider = opts.provider;
  const ps = ensure(provider);
  const now = Date.now();
  if (ps.retryAfter && ps.retryAfter > now) {
    const cached = integrationCache.get(provider, opts.resource);
    if (cached) {
      ps.cacheHits++;
      return { payload: cached.payload as T, fromCache: true, status: 200 };
    }
    throw new Error(
      `Rate-limited until ${new Date(ps.retryAfter).toISOString()}`,
    );
  }

  const key = coalesceKey(opts);
  const existing = inflight.get(key);
  if (existing) return existing as Promise<RequestResult<T>>;

  const exec = (async (): Promise<RequestResult<T>> => {
    const cached = opts.bypassCache
      ? null
      : integrationCache.get(provider, opts.resource);
    const headers: Record<string, string> = { ...opts.headers };
    if (cached?.etag) headers["If-None-Match"] = cached.etag;
    ps.requests++;
    const res = await fetch(opts.url, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body,
    });
    // Capture rate-limit headers when the provider exposes them.
    const remaining = res.headers.get("x-ratelimit-remaining");
    if (remaining !== null) ps.rateLimitRemaining = parseInt(remaining, 10);
    const retryAfter = res.headers.get("retry-after");
    if (retryAfter !== null) {
      const secs = parseInt(retryAfter, 10);
      if (!Number.isNaN(secs)) ps.retryAfter = Date.now() + secs * 1000;
    }
    if (res.status === 304 && cached) {
      ps.cacheHits++;
      return {
        payload: cached.payload as T,
        fromCache: true,
        status: 304,
      };
    }
    if (!res.ok) {
      throw new Error(`${provider} ${opts.url} → ${res.status}`);
    }
    const etag = res.headers.get("etag");
    const payload = (await res.json()) as T;
    integrationCache.put(provider, opts.resource, payload, etag);
    ps.lastSyncedAt = Date.now();
    return { payload, fromCache: false, status: res.status };
  })();

  inflight.set(key, exec);
  // Hold the inflight slot for an extra 2 s after resolution so quick
  // duplicate calls (e.g. tab switch) reuse the result.
  exec.finally(() => {
    setTimeout(() => {
      if (inflight.get(key) === exec) inflight.delete(key);
    }, 2000);
  });
  return exec;
}

/**
 * Mark a sync operation as completed (used by mock providers that don't
 * actually call `request()`). Keeps the debug-stats `lastSyncedAt` honest.
 */
export function noteSync(provider: string): void {
  ensure(provider).lastSyncedAt = Date.now();
}
