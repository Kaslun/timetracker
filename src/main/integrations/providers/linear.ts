import type { FillSuggestion, Project, Task } from "@shared/types";
import { buildExternalUrl } from "@shared/integrations/registry";
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

/**
 * Mock-only: the user's real Linear teams (until the live GraphQL fetch
 * lands). Edit this list when teams change — the provider derives stable
 * project IDs from `key`, so renaming a project here won't create a new
 * row in the DB. To rename, change the `name` only; to actually re-key a
 * project, you'll need to wipe local data first.
 */
const LINEAR_USER_PROJECTS = [
  { key: "SKL", name: "Skills RT", color: "#5e6ad2" },
  { key: "OPE", name: "Operations", color: "#f59e42" },
  { key: "FST", name: "Fast", color: "#7d62d4" },
] as const;

/** Mock-only: representative tasks for each project, all assigned to "me". */
const LINEAR_USER_TASKS: ReadonlyArray<{
  projectKey: (typeof LINEAR_USER_PROJECTS)[number]["key"];
  ticket: string;
  title: string;
  tag: string | null;
  priority: Task["priority"];
}> = [
  {
    projectKey: "SKL",
    ticket: "SKL-104",
    title: "Refresh onboarding scenario library",
    tag: "Improvement",
    priority: "high",
  },
  {
    projectKey: "SKL",
    ticket: "SKL-281",
    title: "Wire feedback survey into post-session flow",
    tag: "Story",
    priority: "medium",
  },
  {
    projectKey: "OPE",
    ticket: "OPE-42",
    title: "Investigate flaky export pipeline",
    tag: "bug",
    priority: "high",
  },
  {
    projectKey: "OPE",
    ticket: "OPE-67",
    title: "Document on-call escalation paths",
    tag: null,
    priority: "low",
  },
  {
    projectKey: "FST",
    ticket: "FST-12",
    title: "Speed up cold-start of the runtime",
    tag: "Improvement",
    priority: "urgent",
  },
];

/** Stable per-row IDs so refresh is idempotent (no duplicate inserts). */
const projectId = (key: string): string => `prj_linear_${key.toLowerCase()}`;
const taskId = (ticket: string): string => `tsk_linear_${ticket.toLowerCase()}`;

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
    // The mock universe is entirely "assigned to me", so the filter
    // collapses to a no-op. We keep the cfg lookup so the contract stays
    // visible — when the live GraphQL fetch lands it must respect both
    // assigneeOnly and includeUnassignedICreated.
    void cfg;

    const workspace = "attensi";
    const now = Date.now();
    const projects: Project[] = LINEAR_USER_PROJECTS.map((p) => ({
      id: projectId(p.key),
      name: p.name,
      color: p.color,
      ticketPrefix: p.key,
      integrationId: this.id,
      archivedAt: null,
    }));
    const tasks: Task[] = LINEAR_USER_TASKS.map((t) => ({
      id: taskId(t.ticket),
      projectId: projectId(t.projectKey),
      ticket: t.ticket,
      title: t.title,
      tag: t.tag,
      archivedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
      integrationId: this.id,
      priority: t.priority,
      externalUrl: buildExternalUrl({
        source: "linear",
        ticket: t.ticket,
        workspace,
      }),
    }));
    return { projects, tasks };
  }

  override fetchActivity(): FillSuggestion[] {
    return [
      {
        id: "linear_act_1",
        at: "10:42",
        src: "Linear",
        label: "Comment on SKL-104",
        meta: "Skills RT",
        confidence: 0.78,
        picked: false,
        durationMinutes: 15,
      },
    ];
  }
}
