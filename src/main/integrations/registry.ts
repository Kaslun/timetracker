/**
 * Central registry for integration providers.
 *
 * Holds the canonical "what's connected" state, exposes a small API the IPC
 * handlers and other main-side services consume, and broadcasts changes
 * back to the renderer over the typed event bus.
 *
 * On boot we hydrate the registry from the keychain: any provider with a
 * persisted token is re-marked as `connected`. We never block startup on
 * keychain reads — they happen lazily once the registry is first asked.
 */
import type {
  IntegrationId,
  IntegrationState,
  Project,
  Task,
} from "@shared/types";
import { db } from "../db";
import { projects as projectsRepo, tasks as tasksRepo } from "../db/repos";
import { broadcast } from "../ipc/events";
import { broadcastChanges } from "../ipc/broadcast";
import { logger } from "../services/logger";
import { deleteSecret, readSecret, writeSecret } from "./secrets";
import { PROVIDERS } from "./providers";
import type { ConnectInput, IntegrationProvider } from "./types";

const log = logger("integrations");

interface Entry {
  provider: IntegrationProvider;
  status: IntegrationState["status"];
  errorMessage: string | null;
  lastSyncedAt: number | null;
  account: string | null;
}

class Registry {
  private byId = new Map<IntegrationId, Entry>();
  private hydrated = false;

  constructor() {
    for (const provider of PROVIDERS) {
      this.byId.set(provider.id, {
        provider,
        status: "disconnected",
        errorMessage: null,
        lastSyncedAt: null,
        account: null,
      });
    }
  }

  /** Idempotent: safe to call multiple times on app start. */
  async hydrate(): Promise<void> {
    if (this.hydrated) return;
    this.hydrated = true;
    await Promise.all(
      [...this.byId.values()].map(async (e) => {
        const token = await readSecret(e.provider.id);
        if (token) {
          e.status = "connected";
          e.account = e.provider.meta.label;
          e.lastSyncedAt = Date.now();
        }
      }),
    );
    this.broadcast();
  }

  list(): IntegrationState[] {
    return [...this.byId.values()].map((e) => this.snapshot(e));
  }

  get(id: IntegrationId): IntegrationState {
    const e = this.require(id);
    return this.snapshot(e);
  }

  /** Return every connected provider implementation (for fill suggestions etc). */
  connectedProviders(): IntegrationProvider[] {
    return [...this.byId.values()]
      .filter((e) => e.status === "connected")
      .map((e) => e.provider);
  }

  async connect(
    id: IntegrationId,
    input: ConnectInput,
  ): Promise<IntegrationState> {
    const e = this.require(id);
    e.status = "connecting";
    e.errorMessage = null;
    this.broadcast();

    try {
      const { account } = await e.provider.validate(input);
      await writeSecret(id, input.token);
      const data = await e.provider.fetchTasks();
      this.persistProviderData(id, data);

      e.status = "connected";
      e.errorMessage = null;
      e.lastSyncedAt = Date.now();
      e.account = account;
      this.broadcast();
      broadcastChanges({ tasks: true });
      return this.snapshot(e);
    } catch (err) {
      e.status = "error";
      e.errorMessage =
        err instanceof Error ? err.message : "Unknown connection error";
      log.warn(`connect(${id}) failed`, err);
      this.broadcast();
      return this.snapshot(e);
    }
  }

  /**
   * Re-fetch tasks/projects for one provider, bypassing any freshness floor.
   * Idempotent: only NEW tasks are inserted; existing rows aren't disturbed.
   * Round-5 contract: provider implementations honour the per-provider
   * `assigneeOnly` and `includeUnassignedICreated` flags from settings.
   */
  async refresh(id: IntegrationId): Promise<void> {
    const e = this.require(id);
    if (e.status !== "connected") {
      throw new Error(`${id} is not connected`);
    }
    const data = await e.provider.fetchTasks();
    this.persistProviderData(id, data);
    e.lastSyncedAt = Date.now();
    this.broadcast();
    broadcastChanges({ tasks: true });
  }

  /** Count of tasks currently in the DB for one provider (used by refresh()). */
  listTaskCount(id: IntegrationId): number {
    const r = db()
      .prepare("SELECT COUNT(*) AS n FROM tasks WHERE integration_id = ?")
      .get(id) as { n: number };
    return r?.n ?? 0;
  }

  async disconnect(id: IntegrationId): Promise<IntegrationState> {
    const e = this.require(id);
    await deleteSecret(id);
    this.purgeProviderData(id);
    e.status = "disconnected";
    e.errorMessage = null;
    e.lastSyncedAt = null;
    e.account = null;
    this.broadcast();
    broadcastChanges({ tasks: true, entries: true });
    return this.snapshot(e);
  }

  // ────────────────────────── internals ──────────────────────────

  private require(id: IntegrationId): Entry {
    const e = this.byId.get(id);
    if (!e) throw new Error(`Unknown integration: ${id}`);
    return e;
  }

  private snapshot(e: Entry): IntegrationState {
    return {
      id: e.provider.id,
      label: e.provider.meta.label,
      meta: e.provider.meta.meta,
      bg: e.provider.meta.bg,
      letter: e.provider.meta.letter,
      status: e.status,
      errorMessage: e.errorMessage,
      lastSyncedAt: e.lastSyncedAt,
      account: e.account,
    };
  }

  private broadcast(): void {
    broadcast("integrations:changed", this.list());
  }

  /**
   * Idempotent upsert of one provider's projects + tasks.
   *
   * Dedupe strategy (defence-in-depth — providers should also use stable
   * IDs, but historical bugs once produced a fresh random ID per refresh,
   * which silently duplicated every row on every sync):
   *
   *   - Project: match by `id`, then fall back to `(integrationId, name)`.
   *   - Task:    match by `id`, then `(integrationId, externalUrl)`,
   *              then `(integrationId, ticket)`.
   *
   * Any matched existing row is left untouched (so the user's local edits
   * to title/tag aren't clobbered) and we simply remap the incoming
   * `projectId` so freshly-inserted tasks land under the canonical project.
   *
   * Once the canonical set is persisted, `cleanupOrphanedRows` drops any
   * legacy rows owned by this integration that are no longer in the
   * canonical set AND have no time entries — recovers a DB that was
   * polluted by the per-call random-ID bug.
   */
  private persistProviderData(
    id: IntegrationId,
    data: { projects: Project[]; tasks: Task[] },
  ): void {
    const trx = db().transaction(() => {
      const projectIdMap = new Map<string, string>();
      const canonicalProjectIds = new Set<string>();
      for (const p of data.projects) {
        const existing =
          projectsRepo.get(p.id) ??
          projectsRepo.findByIntegrationName(id, p.name);
        const canonicalId = existing?.id ?? p.id;
        projectIdMap.set(p.id, canonicalId);
        canonicalProjectIds.add(canonicalId);
        if (!existing) {
          projectsRepo.create({ ...p, integrationId: p.integrationId ?? id });
        }
      }

      const canonicalTaskIds = new Set<string>();
      for (const t of data.tasks) {
        const remappedProjectId = projectIdMap.get(t.projectId) ?? t.projectId;
        const existing =
          tasksRepo.get(t.id) ??
          (t.externalUrl
            ? tasksRepo.getByExternalUrl(id, t.externalUrl)
            : null) ??
          (t.ticket ? tasksRepo.findByIntegrationTicket(id, t.ticket) : null);
        const canonicalId = existing?.id ?? t.id;
        canonicalTaskIds.add(canonicalId);
        if (!existing) {
          tasksRepo.create({
            projectId: remappedProjectId,
            title: t.title,
            ticket: t.ticket,
            tag: t.tag,
            id: t.id,
            integrationId: t.integrationId ?? id,
            priority: t.priority,
            externalUrl: t.externalUrl,
          });
        }
      }

      this.cleanupOrphanedRows(id, canonicalProjectIds, canonicalTaskIds);
    });
    trx();
  }

  /**
   * Remove integration-owned rows that the provider no longer reports AND
   * that have no tracked time entries. Lets us recover from the historical
   * "fresh ID per refresh" bug without touching anything the user has
   * actively logged time against.
   */
  private cleanupOrphanedRows(
    id: IntegrationId,
    keepProjectIds: Set<string>,
    keepTaskIds: Set<string>,
  ): void {
    for (const t of tasksRepo
      .list()
      .filter((row) => row.integrationId === id && !keepTaskIds.has(row.id))) {
      if (tasksRepo.entryCount(t.id) === 0) {
        tasksRepo.hardDelete(t.id);
      }
    }
    for (const p of projectsRepo.listByIntegration(id)) {
      if (keepProjectIds.has(p.id)) continue;
      if (projectsRepo.taskCount(p.id) === 0) {
        projectsRepo.hardDelete(p.id);
      }
    }
  }

  private purgeProviderData(id: IntegrationId): void {
    const trx = db().transaction(() => {
      // Delete entries whose task belongs to a project from this integration,
      // then the tasks, then the projects. Foreign-key cascades handle the
      // entries automatically once we remove the project, but we run an
      // explicit cleanup so the broadcast picks the new list up cleanly.
      db()
        .prepare(
          `DELETE FROM entries
           WHERE task_id IN (
             SELECT t.id FROM tasks t
             JOIN projects p ON p.id = t.project_id
             WHERE p.integration_id = ?
           )`,
        )
        .run(id);
      db()
        .prepare(
          `DELETE FROM tasks WHERE project_id IN (
             SELECT id FROM projects WHERE integration_id = ?
           )`,
        )
        .run(id);
      db().prepare("DELETE FROM projects WHERE integration_id = ?").run(id);
    });
    trx();
  }
}

let _registry: Registry | null = null;

export function getProviderRegistry(): Registry {
  if (!_registry) _registry = new Registry();
  return _registry;
}

export async function hydrateProviderRegistry(): Promise<void> {
  await getProviderRegistry().hydrate();
}
