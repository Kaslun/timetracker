/**
 * Idempotency table for outbound integration syncs (currently Tempo).
 *
 * Each row maps a local `entry.id` to the remote provider's worklog id, so
 * re-syncing an entry **updates** rather than **duplicates**. The
 * `remoteUpdatedAt` cursor is what we compare against the provider's record
 * to detect a remote-side edit (conflict).
 */
import { db } from "../index";

export interface EntrySyncRow {
  entryId: string;
  provider: string;
  remoteId: string;
  remoteUpdatedAt: number | null;
  syncedAt: number;
  conflict: boolean;
}

interface Row {
  entry_id: string;
  provider: string;
  remote_id: string;
  remote_updated_at: number | null;
  synced_at: number;
  conflict: number;
}

const map = (r: Row): EntrySyncRow => ({
  entryId: r.entry_id,
  provider: r.provider,
  remoteId: r.remote_id,
  remoteUpdatedAt: r.remote_updated_at,
  syncedAt: r.synced_at,
  conflict: !!r.conflict,
});

export const entrySync = {
  get(entryId: string, provider: string): EntrySyncRow | null {
    const r = db()
      .prepare("SELECT * FROM entry_sync WHERE entry_id = ? AND provider = ?")
      .get(entryId, provider) as Row | undefined;
    return r ? map(r) : null;
  },

  upsert(input: {
    entryId: string;
    provider: string;
    remoteId: string;
    remoteUpdatedAt: number | null;
    conflict?: boolean;
  }): void {
    db()
      .prepare(
        `INSERT INTO entry_sync (entry_id, provider, remote_id, remote_updated_at, synced_at, conflict)
         VALUES (@entryId, @provider, @remoteId, @remoteUpdatedAt, @syncedAt, @conflict)
         ON CONFLICT(entry_id) DO UPDATE SET
           provider = excluded.provider,
           remote_id = excluded.remote_id,
           remote_updated_at = excluded.remote_updated_at,
           synced_at = excluded.synced_at,
           conflict = excluded.conflict`,
      )
      .run({
        entryId: input.entryId,
        provider: input.provider,
        remoteId: input.remoteId,
        remoteUpdatedAt: input.remoteUpdatedAt,
        syncedAt: Date.now(),
        conflict: input.conflict ? 1 : 0,
      });
  },

  /** All sync rows for one provider (used by the conflict resolver UI). */
  listForProvider(provider: string): EntrySyncRow[] {
    return (
      db()
        .prepare("SELECT * FROM entry_sync WHERE provider = ?")
        .all(provider) as Row[]
    ).map(map);
  },

  /** Number of rows currently flagged with a remote-side edit conflict. */
  countConflicts(provider: string): number {
    const r = db()
      .prepare(
        "SELECT COUNT(*) AS n FROM entry_sync WHERE provider = ? AND conflict = 1",
      )
      .get(provider) as { n: number };
    return r?.n ?? 0;
  },

  remove(entryId: string): void {
    db().prepare("DELETE FROM entry_sync WHERE entry_id = ?").run(entryId);
  },

  purgeProvider(provider: string): void {
    db().prepare("DELETE FROM entry_sync WHERE provider = ?").run(provider);
  },
};
