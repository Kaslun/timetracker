/**
 * Cross-cutting metadata for every integration provider.
 *
 * Lives in `shared/` so the **renderer** (chips, source links, intro grid)
 * and the **main process** (audit log labels, fallback meta) read from one
 * source of truth. The actual provider implementations (HTTP clients, mock
 * fetchers) still live in `src/main/integrations/providers/*.ts` and are
 * keyed by `id` here.
 *
 * Adding a new provider = one entry here + one provider class in main.
 */
import type { IntegrationId } from "../types";

export interface IntegrationMeta {
  id: IntegrationId;
  /** Human-readable name (e.g. "Linear"). */
  label: string;
  /** Sub-line shown below the label in Settings tiles. */
  subtitle: string;
  /** Brand background colour. Used as the row swatch + chip tint. */
  brandColor: string;
  /** Single-glyph mark for the swatch when no icon is rendered. */
  letter: string;
  /**
   * URL template for opening a task in the source provider's web UI.
   *
   * Tokens:
   *   - `{ticket}` — issue key (e.g. "MOB-104")
   *   - `{workspace}` — workspace/team slug
   *   - `{id}` — opaque external id (Asana / Notion / GCal)
   *
   * Set to `null` for providers without a public per-task URL (Slack/Teams).
   */
  urlTemplate: string | null;
  /**
   * Workspace slug placeholder rendered in the connect drawer if the
   * provider requires one. `null` means "no workspace input".
   */
  workspaceLabel: string | null;
  /**
   * Whether this provider is expected to surface assignee-scoped tasks.
   * Drives the per-provider toggle in Settings → Integrations.
   */
  supportsAssigneeFilter: boolean;
}

export const INTEGRATION_META: Record<IntegrationId, IntegrationMeta> = {
  linear: {
    id: "linear",
    label: "Linear",
    subtitle: "issues · tickets",
    brandColor: "#5e6ad2",
    letter: "L",
    urlTemplate: "https://linear.app/{workspace}/issue/{ticket}",
    workspaceLabel: "Workspace slug",
    supportsAssigneeFilter: true,
  },
  jira: {
    id: "jira",
    label: "Jira",
    subtitle: "tickets · epics",
    brandColor: "#2684ff",
    letter: "J",
    urlTemplate: "https://{workspace}.atlassian.net/browse/{ticket}",
    workspaceLabel: "Atlassian site (e.g. acme)",
    supportsAssigneeFilter: true,
  },
  asana: {
    id: "asana",
    label: "Asana",
    subtitle: "tasks · projects",
    brandColor: "#f06a6a",
    letter: "A",
    urlTemplate: "https://app.asana.com/0/0/{id}",
    workspaceLabel: "Workspace id",
    supportsAssigneeFilter: true,
  },
  slack: {
    id: "slack",
    label: "Slack",
    subtitle: "status · DMs",
    brandColor: "#4a154b",
    letter: "#",
    urlTemplate: null,
    workspaceLabel: "Workspace",
    supportsAssigneeFilter: false,
  },
  teams: {
    id: "teams",
    label: "Microsoft Teams",
    subtitle: "meetings · calls",
    brandColor: "#5059c9",
    letter: "T",
    urlTemplate: null,
    workspaceLabel: "Tenant",
    supportsAssigneeFilter: false,
  },
  github: {
    id: "github",
    label: "GitHub",
    subtitle: "PRs · commits",
    brandColor: "#1a1e22",
    letter: "◐",
    urlTemplate: "https://github.com/{workspace}/issues/{id}",
    workspaceLabel: "Owner/Repo",
    supportsAssigneeFilter: true,
  },
  gcal: {
    id: "gcal",
    label: "Google Calendar",
    subtitle: "events · blocks",
    brandColor: "#4285f4",
    letter: "◎",
    urlTemplate: "https://calendar.google.com/calendar/u/0/r/eventedit/{id}",
    workspaceLabel: null,
    supportsAssigneeFilter: false,
  },
  notion: {
    id: "notion",
    label: "Notion",
    subtitle: "docs · databases",
    brandColor: "#111111",
    letter: "N",
    urlTemplate: "https://www.notion.so/{id}",
    workspaceLabel: "Workspace",
    supportsAssigneeFilter: true,
  },
};

/**
 * Source token used in task lists / filters. `"local"` covers tasks the user
 * created by hand (no integration owner).
 */
export type TaskSource = IntegrationId | "local";

export const TASK_SOURCES: TaskSource[] = [
  "local",
  "linear",
  "jira",
  "asana",
  "github",
  "notion",
  "gcal",
];

/** Display label for a task source (with "Local" cased properly). */
export function sourceLabel(source: TaskSource): string {
  if (source === "local") return "Local";
  return INTEGRATION_META[source].label;
}

/** Brand colour for a task source; falls back to neutral grey for `local`. */
export function sourceColor(source: TaskSource): string {
  if (source === "local") return "#9aa0a6";
  return INTEGRATION_META[source].brandColor;
}

/**
 * Build the canonical URL for a task in the source provider's UI.
 * Returns null when the provider has no public per-task URL OR when the
 * required template tokens are missing on the task.
 */
export function buildExternalUrl(input: {
  source: TaskSource;
  ticket: string | null;
  workspace?: string | null;
  externalId?: string | null;
}): string | null {
  if (input.source === "local") return null;
  const meta = INTEGRATION_META[input.source];
  if (!meta.urlTemplate) return null;
  let url = meta.urlTemplate;
  url = url.replace("{ticket}", input.ticket ?? "");
  url = url.replace("{workspace}", input.workspace ?? "");
  url = url.replace("{id}", input.externalId ?? "");
  // If a required token is still empty, refuse to return a broken URL.
  if (url.includes("//") && /\/\/+(\?|$)/.test(url)) return null;
  if (url.endsWith("/")) return null;
  return url;
}

/**
 * Resolve the source token for a task given its `integrationId` field.
 * Centralised so renderer chips and filter logic agree.
 */
export function taskSource(integrationId: string | null): TaskSource {
  if (!integrationId) return "local";
  if (integrationId in INTEGRATION_META) {
    return integrationId as IntegrationId;
  }
  return "local";
}
