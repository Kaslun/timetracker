/**
 * Integration provider contract.
 *
 * Each provider (Linear, Jira, Slack, …) ships an implementation of this
 * interface. The registry hands the UI a `Provider` plus the latest cached
 * `IntegrationState` so the renderer never has to know the difference between
 * a mock and a real OAuth-backed implementation.
 *
 * The shape is intentionally small: enough surface to sketch v2 auth + data
 * fetches, with room to grow into real OAuth flows without churning IPC.
 */
import type {
  FillSuggestion,
  IntegrationId,
  Task,
  Project,
  IntegrationState,
} from "@shared/types";

export interface ConnectInput {
  /** API token, OAuth code, or any provider-specific secret. */
  token: string;
  /** Optional workspace/team identifier the user picked. */
  workspace?: string | null;
  /** Optional list of OAuth scopes the user authorised. */
  scopes?: string[];
}

export interface IntegrationProvider {
  readonly id: IntegrationId;
  /** Render-side metadata: label, brand colour, single-glyph mark, sub-line. */
  readonly meta: Pick<IntegrationState, "label" | "meta" | "bg" | "letter">;

  /**
   * Validate credentials and return an account summary if the token is good.
   * Implementations should `throw` with a user-readable message on failure;
   * the registry catches the throw and parks the provider in `error` state.
   */
  validate(input: ConnectInput): Promise<{ account: string }>;

  /** Pull tasks/issues that should appear in the user's task list. */
  fetchTasks(): Promise<{ projects: Project[]; tasks: Task[] }>;

  /** Pull recent activity surfaced as fill-gap suggestions. */
  fetchActivity(): FillSuggestion[];
}
