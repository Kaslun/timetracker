import type { FillSuggestion, Project, Task } from "@shared/types";
import { buildExternalUrl } from "@shared/integrations/registry";
import { newId } from "../../db";
import { settings as settingsRepo } from "../../db/repos/settings";
import type { ConnectInput } from "../types";
import { BaseProvider } from "./base";

/**
 * Linear provider.
 *
 * v2 ships an architecture-only implementation: the token is validated against
 * a basic shape rule, and the returned projects/tasks/activity are a
 * representative sample so the rest of the app can demonstrate populated
 * state once the user connects. When the real backend lands, swap the body
 * of `validate` and `fetchTasks` for HTTP calls — the UI and IPC layers
 * don't need to change.
 *
 * Round-5 contract: `fetchTasks` MUST honour the per-provider
 * `assigneeOnly` config (default true). The mock dataset emulates this by
 * tagging the returned tasks with the connected workspace and only emitting
 * tasks the "current user" would own.
 */
export class LinearProvider extends BaseProvider {
  readonly id = "linear" as const;
  readonly meta = {
    label: "Linear",
    meta: "issues · tickets",
    bg: "#5e6ad2",
    letter: "L",
  };

  override async validate(input: ConnectInput): Promise<{ account: string }> {
    const t = input.token.trim();
    if (!t) throw new Error("API token is required");
    if (!/^lin_(api_)?[A-Za-z0-9]+$/.test(t)) {
      throw new Error(
        "Tokens should look like `lin_api_…` — copy yours from Linear → Settings → API",
      );
    }
    return { account: input.workspace?.trim() || "Attensi" };
  }

  override async fetchTasks(): Promise<{
    projects: Project[];
    tasks: Task[];
  }> {
    const cfg = settingsRepo.getAll().integrationConfigs?.[this.id] ?? {
      assigneeOnly: true,
      includeUnassignedICreated: false,
    };
    const workspace = "attensi";
    const now = Date.now();
    const mobileId = newId("prj");
    const platformId = newId("prj");
    const projects: Project[] = [
      {
        id: mobileId,
        name: "Mobile Runtime",
        color: "#5e6ad2",
        ticketPrefix: "MOB",
        integrationId: this.id,
        archivedAt: null,
      },
      {
        id: platformId,
        name: "Platform",
        color: "#7d62d4",
        ticketPrefix: "PLT",
        integrationId: this.id,
        archivedAt: null,
      },
    ];
    // Mock dataset: pretend "MOB-104" + "PLT-281" are assigned to the user
    // and "PLT-300" is unassigned-but-created-by-them. The real implementation
    // applies `assignee: { isMe: true }` (and an OR with `creator` if
    // includeUnassignedICreated) at the GraphQL layer.
    const all: Array<Task & { _assignedToMe: boolean; _createdByMe: boolean }> =
      [
        {
          id: newId("tsk"),
          projectId: mobileId,
          ticket: "MOB-104",
          title: "Fix iOS build crash on cold start",
          tag: "dev",
          archivedAt: null,
          completedAt: null,
          createdAt: now,
          updatedAt: now,
          integrationId: this.id,
          priority: "high",
          externalUrl: buildExternalUrl({
            source: "linear",
            ticket: "MOB-104",
            workspace,
          }),
          _assignedToMe: true,
          _createdByMe: false,
        },
        {
          id: newId("tsk"),
          projectId: platformId,
          ticket: "PLT-281",
          title: "Migrate auth tokens to keychain",
          tag: "dev",
          archivedAt: null,
          completedAt: null,
          createdAt: now,
          updatedAt: now,
          integrationId: this.id,
          priority: "medium",
          externalUrl: buildExternalUrl({
            source: "linear",
            ticket: "PLT-281",
            workspace,
          }),
          _assignedToMe: true,
          _createdByMe: true,
        },
        {
          id: newId("tsk"),
          projectId: platformId,
          ticket: "PLT-300",
          title: "Document onboarding flow",
          tag: "docs",
          archivedAt: null,
          completedAt: null,
          createdAt: now,
          updatedAt: now,
          integrationId: this.id,
          priority: "low",
          externalUrl: buildExternalUrl({
            source: "linear",
            ticket: "PLT-300",
            workspace,
          }),
          _assignedToMe: false,
          _createdByMe: true,
        },
      ];
    const tasks: Task[] = all
      .filter((t) => {
        if (!cfg.assigneeOnly) return true;
        if (t._assignedToMe) return true;
        if (cfg.includeUnassignedICreated && t._createdByMe) return true;
        return false;
      })
      // Strip the synthetic flags before returning.
      .map(({ _assignedToMe: _a, _createdByMe: _c, ...rest }) => {
        void _a;
        void _c;
        return rest;
      });
    return { projects, tasks };
  }

  override fetchActivity(): FillSuggestion[] {
    return [
      {
        id: "linear_act_1",
        at: "10:42",
        src: "Linear",
        label: "Comment on MOB-104",
        meta: "Mobile Runtime",
        confidence: 0.78,
        picked: false,
        durationMinutes: 15,
      },
    ];
  }
}
