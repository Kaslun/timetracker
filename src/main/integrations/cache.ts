/**
 * SQLite-backed integration response cache.
 *
 * Each provider stores a small payload (JSON) plus the `etag` and
 * `updated_at` cursor it received. The next request sends `If-None-Match`
 * with the stored ETag; a 304 response means "use the cached payload" and
 * doesn't count against the user's request budget.
 *
 * The cache is read-through — providers ask for `get(provider, resource)`
 * before making a call. After a successful HTTP response, providers call
 * `put(provider, resource, payload, etag)` to update the cursor.
 *
 * Coalescing + rate-limit awareness live in `httpClient.ts` and read from
 * this cache too.
 */
import { db } from "../db";

export interface CacheEntry {
  payload: unknown;
  etag: string | null;
  updatedAt: number;
}

export const integrationCache = {
  get(provider: string, resource: string): CacheEntry | null {
    const row = db()
      .prepare(
        "SELECT etag, updated_at, payload FROM integration_cache WHERE provider = ? AND resource = ?",
      )
      .get(provider, resource) as
      | { etag: string | null; updated_at: number; payload: string }
      | undefined;
    if (!row) return null;
    try {
      return {
        payload: JSON.parse(row.payload),
        etag: row.etag,
        updatedAt: row.updated_at,
      };
    } catch {
      // Corrupt JSON: drop the row so a fresh fetch heals.
      db()
        .prepare(
          "DELETE FROM integration_cache WHERE provider = ? AND resource = ?",
        )
        .run(provider, resource);
      return null;
    }
  },

  put(
    provider: string,
    resource: string,
    payload: unknown,
    etag: string | null,
  ): void {
    db()
      .prepare(
        `INSERT INTO integration_cache (provider, resource, etag, updated_at, payload)
         VALUES (@provider, @resource, @etag, @updatedAt, @payload)
         ON CONFLICT(provider, resource) DO UPDATE SET
           etag = excluded.etag,
           updated_at = excluded.updated_at,
           payload = excluded.payload`,
      )
      .run({
        provider,
        resource,
        etag,
        updatedAt: Date.now(),
        payload: JSON.stringify(payload),
      });
  },

  /** Wipe every cached payload for one provider (used on disconnect). */
  purge(provider: string): void {
    db()
      .prepare("DELETE FROM integration_cache WHERE provider = ?")
      .run(provider);
  },

  /** Last-updated timestamps for the debug panel. */
  list(): Array<{ provider: string; resource: string; updatedAt: number }> {
    return (
      db()
        .prepare(
          "SELECT provider, resource, updated_at FROM integration_cache ORDER BY updated_at DESC",
        )
        .all() as Array<{
        provider: string;
        resource: string;
        updated_at: number;
      }>
    ).map((r) => ({
      provider: r.provider,
      resource: r.resource,
      updatedAt: r.updated_at,
    }));
  },
};

/**
 * Freshness floor: window-focus refresh is suppressed if the cache for a
 * resource is younger than this. Manual "Refresh" overrides.
 */
export const CACHE_FOCUS_FLOOR_MS = 5 * 60_000;
/** Background polling cadence. */
export const CACHE_BG_INTERVAL_MS = 15 * 60_000;
