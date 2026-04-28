import type { FillSuggestion, Project, Task } from "@shared/types";
import type { ConnectInput } from "../types";
import { newId } from "../../db";
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
    const tasks: Task[] = [
      {
        id: newId("tsk"),
        projectId: mobileId,
        ticket: "MOB-104",
        title: "Fix iOS build crash on cold start",
        tag: "dev",
        archivedAt: null,
        completedAt: null,
        createdAt: now,
        integrationId: this.id,
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
        integrationId: this.id,
      },
    ];
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
