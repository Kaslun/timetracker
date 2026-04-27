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

  private persistProviderData(
    _id: IntegrationId,
    data: { projects: Project[]; tasks: Task[] },
  ): void {
    const trx = db().transaction(() => {
      for (const p of data.projects) {
        const existing = projectsRepo.get(p.id);
        if (!existing) projectsRepo.create(p);
      }
      for (const t of data.tasks) {
        if (!tasksRepo.get(t.id)) {
          tasksRepo.create({
            projectId: t.projectId,
            title: t.title,
            ticket: t.ticket,
            tag: t.tag,
            id: t.id,
          });
        }
      }
    });
    trx();
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
