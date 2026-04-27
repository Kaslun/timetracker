import type {
  FillSuggestion,
  IntegrationId,
  IntegrationState,
  Project,
  Task,
} from "@shared/types";
import type { ConnectInput, IntegrationProvider } from "../types";

/**
 * Base implementation that real providers extend.
 *
 * The default `validate()` accepts any non-empty token and reports a generic
 * account name — good enough for the v2 architecture milestone where we're
 * verifying the *shape* of the integration flow, not real OAuth backends.
 *
 * Real providers should override `validate` and `fetchTasks` once their
 * backend ships. UI/IPC code does not need to change.
 */
export abstract class BaseProvider implements IntegrationProvider {
  abstract readonly id: IntegrationId;
  abstract readonly meta: Pick<
    IntegrationState,
    "label" | "meta" | "bg" | "letter"
  >;

  async validate(input: ConnectInput): Promise<{ account: string }> {
    if (!input.token.trim()) {
      throw new Error("Token is required");
    }
    if (input.token.trim().length < 6) {
      throw new Error("That token looks too short — double-check and retry");
    }
    return { account: input.workspace?.trim() || this.meta.label };
  }

  async fetchTasks(): Promise<{ projects: Project[]; tasks: Task[] }> {
    return { projects: [], tasks: [] };
  }

  fetchActivity(): FillSuggestion[] {
    return [];
  }
}
