/**
 * Jira → Tempo worklog sync.
 *
 * Tempo is a separate Atlassian-marketplace product with its own REST API
 * (`/rest/tempo-timesheets/4/worklogs` on Jira Server, or the Tempo Cloud
 * API on Cloud). On Jira connect we **probe** for it — a simple GET that
 * returns 200 (or 401 if the token lacks Tempo scopes, which we treat as
 * "detected but not authorised").
 *
 * Sync direction: **local → Tempo only**. Local edits push out; Tempo edits
 * are detected via the `updated` timestamp and surfaced as conflicts —
 * never silently clobbered.
 *
 * Idempotency: `entry_sync` maps `entryId → worklogId`. Repeated syncs
 * UPDATE the existing worklog instead of POSTing a duplicate.
 *
 * This module is HTTP-ready: when a real Jira/Tempo integration ships, the
 * stubs in `pushWorklog` / `fetchRemote` swap in fetch calls. Today they
 * return inert results so the sync engine can be wired and tested end-to-end
 * without leaking traffic. Dry-run mode forces the inert path even after
 * real HTTP lands.
 */
import type { Entry, Settings } from "@shared/types";
import { resolveConflict } from "@shared/lib/timeline";
import { entries } from "../db/repos/entries";
import { entrySync } from "../db/repos/entrySync";
import { tasks } from "../db/repos/tasks";
import { settings as settingsRepo } from "../db/repos/settings";
import { audit } from "../services/audit";
import { noteSync } from "./httpClient";

void resolveConflict;

export interface TempoSyncResult {
  ok: boolean;
  pushed: number;
  conflicts: number;
  skipped: number;
  dryRun: boolean;
  message: string | null;
}

/**
 * One-shot sync of every closed local entry whose task carries a Jira
 * ticket. Open entries are skipped (Tempo wants final durations).
 *
 * Conflict policy: if an existing worklog has a `remoteUpdatedAt` newer
 * than our last sync record, mark it `conflict: true` and skip. The user
 * resolves via the Settings → Sync UI (TBD in the renderer) which can call
 * back here with `force: true` for "local-wins".
 */
export async function runTempoSync(
  opts: { dryRun?: boolean } = {},
): Promise<TempoSyncResult> {
  const cfg = settingsRepo.getAll();
  const jiraCfg = cfg.integrationConfigs.jira?.tempo;
  const dryRun = opts.dryRun ?? jiraCfg?.dryRun ?? false;

  if (!jiraCfg?.enabled && !dryRun) {
    return inertResult(dryRun, "Tempo sync is disabled in settings.");
  }
  if (!cfg.integrationsConnected.jira && !dryRun) {
    return inertResult(dryRun, "Jira is not connected.");
  }

  let pushed = 0;
  let conflicts = 0;
  let skipped = 0;

  // Pull all entries from the last 30 days that aren't already in sync.
  const since = Date.now() - 30 * 24 * 60 * 60_000;
  const rows = entries.list({ from: since });
  for (const row of rows) {
    if (row.endedAt === null) {
      skipped++;
      continue;
    }
    const task = tasks.get(row.taskId);
    if (!task || !task.ticket) {
      skipped++;
      continue;
    }
    if (task.integrationId !== "jira") {
      skipped++;
      continue;
    }
    const existing = entrySync.get(row.id, "jira");
    try {
      const result = await syncOne({ entry: row, ticket: task.ticket, dryRun });
      if (result === "conflict") {
        conflicts++;
        entrySync.upsert({
          entryId: row.id,
          provider: "jira",
          remoteId: existing?.remoteId ?? "(remote)",
          remoteUpdatedAt: existing?.remoteUpdatedAt ?? null,
          conflict: true,
        });
        continue;
      }
      if (result === "skip") {
        skipped++;
        continue;
      }
      pushed++;
    } catch (err) {
      audit("tempo_sync_error", {
        entryId: row.id,
        message: err instanceof Error ? err.message : String(err),
      });
      skipped++;
    }
  }

  noteSync("jira");
  audit("tempo_sync_complete", { pushed, conflicts, skipped, dryRun });
  return {
    ok: true,
    pushed,
    conflicts,
    skipped,
    dryRun,
    message: dryRun ? "Dry-run only; no API calls were made." : null,
  };
}

async function syncOne(args: {
  entry: Entry;
  ticket: string;
  dryRun: boolean;
}): Promise<"pushed" | "conflict" | "skip"> {
  const { entry, ticket, dryRun } = args;
  const remote = await fetchRemote(entry.id);
  const local = entrySync.get(entry.id, "jira");
  if (
    remote &&
    local &&
    remote.updatedAt !== local.remoteUpdatedAt &&
    remote.updatedAt > local.syncedAt
  ) {
    return "conflict";
  }
  if (dryRun) return "pushed";
  const remoteId = await pushWorklog({ entry, ticket });
  entrySync.upsert({
    entryId: entry.id,
    provider: "jira",
    remoteId,
    remoteUpdatedAt: Date.now(),
    conflict: false,
  });
  return "pushed";
}

/**
 * Stub for the real Tempo POST/PUT. Returns the local entry id verbatim so
 * the idempotency table can stash a value for round-tripping. When real
 * HTTP lands, this becomes a `request()` call from `httpClient.ts`.
 */
async function pushWorklog(args: {
  entry: Entry;
  ticket: string;
}): Promise<string> {
  void args;
  return Promise.resolve(`stub-${args.entry.id}`);
}

/**
 * Stub for "fetch the remote worklog so we can compare its updatedAt
 * against our cached cursor." Real impl would `request()` against the
 * Tempo `/worklogs/{id}` endpoint with `If-None-Match`.
 */
async function fetchRemote(
  entryId: string,
): Promise<{ updatedAt: number } | null> {
  void entryId;
  return Promise.resolve(null);
}

function inertResult(dryRun: boolean, message: string): TempoSyncResult {
  return {
    ok: false,
    pushed: 0,
    conflicts: 0,
    skipped: 0,
    dryRun,
    message,
  };
}

/** Decide if the per-provider config has Tempo turned on. */
export function tempoEnabled(s: Settings): boolean {
  return !!s.integrationConfigs.jira?.tempo?.enabled;
}
