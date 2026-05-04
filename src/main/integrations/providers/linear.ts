import type {
  FillSuggestion,
  Project,
  Task,
  TaskPriority,
} from "@shared/types";
import { buildExternalUrl } from "@shared/integrations/registry";
import { settings as settingsRepo } from "../../db/repos/settings";
import { noteSync } from "../httpClient";
import { readSecret } from "../secrets";
import type { ConnectInput } from "../types";
import { BaseProvider } from "./base";

/**
 * Linear provider — [Linear GraphQL API](https://linear.app/developers/graphql).
 *
 * The API key identifies the Linear account; we filter issues **in GraphQL**
 * (never client-side) using `assignee: { isMe: true }` and related filters so
 * each installation only sees work for that account. See `docs/INTEGRATIONS.md`.
 */

const LINEAR_GQL = "https://api.linear.app/graphql";
const PAGE_SIZE = 100;
const MAX_PAGES = 20;

interface GqlError {
  message: string;
}

interface GqlResponse<T> {
  data?: T;
  errors?: GqlError[];
}

async function linearGraphql<T>(
  apiKey: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(LINEAR_GQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Personal API keys: `Authorization: <key>` (not Bearer) — see Linear docs.
      Authorization: apiKey.trim(),
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Linear API HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const body = (await res.json()) as GqlResponse<T>;
  if (body.errors?.length) {
    throw new Error(body.errors.map((e) => e.message).join("; "));
  }
  if (body.data === undefined) {
    throw new Error("Linear API returned no data");
  }
  return body.data;
}

function mapLinearPriority(n: number | null | undefined): TaskPriority {
  if (n == null) return "none";
  if (n === 1) return "urgent";
  if (n === 2) return "high";
  if (n === 3) return "medium";
  if (n === 4) return "low";
  return "none";
}

/** Issue filters AND state (open issues only) — resolved server-side for the API key user. */
function buildIssueFilter(opts: {
  assigneeOnly: boolean;
  includeUnassignedICreated: boolean;
}): Record<string, unknown> {
  const openStates = { type: { nin: ["completed", "canceled"] } };
  if (opts.assigneeOnly) {
    if (opts.includeUnassignedICreated) {
      return {
        state: openStates,
        or: [
          { assignee: { isMe: true } },
          {
            assignee: { null: true },
            creator: { isMe: true },
          },
        ],
      };
    }
    return {
      state: openStates,
      assignee: { isMe: true },
    };
  }
  return {
    state: openStates,
    or: [{ assignee: { isMe: true } }, { creator: { isMe: true } }],
  };
}

const ISSUES_QUERY = `
query LinearIssues($filter: IssueFilter, $first: Int!, $after: String) {
  issues(filter: $filter, first: $first, after: $after) {
    pageInfo {
      hasNextPage
      endCursor
    }
    nodes {
      id
      identifier
      title
      priority
      createdAt
      updatedAt
      labels(first: 10) {
        nodes {
          name
        }
      }
      team {
        id
        name
        key
        color
        organization {
          urlKey
        }
      }
    }
  }
}`;

interface LinearIssueNode {
  id: string;
  identifier: string;
  title: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
  labels: { nodes: Array<{ name: string } | null> | null };
  team: {
    id: string;
    name: string;
    key: string;
    color: string;
    organization: { urlKey: string } | null;
  } | null;
}

interface IssuesQueryData {
  issues: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    nodes: LinearIssueNode[];
  };
}

const projectIdForTeam = (teamId: string): string => `prj_linear_${teamId}`;

const taskIdForIssue = (identifier: string): string =>
  `tsk_linear_${identifier.toLowerCase()}`;

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
    const data = await linearGraphql<{
      viewer: { name: string; email: string };
    }>(t, `query { viewer { name email } }`);
    const account =
      data.viewer.name?.trim() || data.viewer.email?.trim() || this.meta.label;
    return { account };
  }

  override async fetchTasks(): Promise<{
    projects: Project[];
    tasks: Task[];
  }> {
    const apiKey = await readSecret(this.id);
    if (!apiKey?.trim()) {
      throw new Error(
        "Linear is not connected — add an API key in Integrations",
      );
    }

    const cfg = settingsRepo.getAll().integrationConfigs?.[this.id] ?? {
      assigneeOnly: true,
      includeUnassignedICreated: false,
    };

    const filter = buildIssueFilter({
      assigneeOnly: cfg.assigneeOnly,
      includeUnassignedICreated: cfg.includeUnassignedICreated,
    });

    let defaultWorkspace = "linear";
    try {
      const orgProbe = await linearGraphql<{
        viewer: {
          organizations?: { nodes: Array<{ urlKey: string } | null> | null };
        };
      }>(apiKey, `query { viewer { organizations { nodes { urlKey } } } }`);
      const first = orgProbe.viewer.organizations?.nodes?.find(
        (n) => n?.urlKey,
      )?.urlKey;
      if (first?.trim()) defaultWorkspace = first.trim();
    } catch {
      /* fall back — per-issue team.organization usually supplies urlKey */
    }

    const seenIssueIds = new Set<string>();
    const issueNodes: LinearIssueNode[] = [];
    let after: string | null = null;
    let pages = 0;

    while (pages < MAX_PAGES) {
      pages++;
      const page: IssuesQueryData = await linearGraphql<IssuesQueryData>(
        apiKey,
        ISSUES_QUERY,
        {
          filter,
          first: PAGE_SIZE,
          after,
        },
      );
      for (const node of page.issues.nodes) {
        if (seenIssueIds.has(node.id)) continue;
        seenIssueIds.add(node.id);
        issueNodes.push(node);
      }
      if (
        !page.issues.pageInfo.hasNextPage ||
        !page.issues.pageInfo.endCursor
      ) {
        break;
      }
      after = page.issues.pageInfo.endCursor;
    }

    const teams = new Map<
      string,
      { id: string; name: string; key: string; color: string }
    >();
    for (const issue of issueNodes) {
      const tm = issue.team;
      if (!tm) continue;
      if (!teams.has(tm.id)) {
        teams.set(tm.id, {
          id: tm.id,
          name: tm.name,
          key: tm.key,
          color: tm.color || "#5e6ad2",
        });
      }
    }

    const projects: Project[] = [...teams.values()].map((t) => ({
      id: projectIdForTeam(t.id),
      name: t.name,
      color: t.color,
      ticketPrefix: t.key,
      integrationId: this.id,
      archivedAt: null,
    }));

    const now = Date.now();
    const tasks: Task[] = [];
    for (const issue of issueNodes) {
      const tm = issue.team;
      if (!tm) continue;

      const pid = projectIdForTeam(tm.id);
      const workspace = tm.organization?.urlKey?.trim() || defaultWorkspace;
      const labelNodes = issue.labels?.nodes ?? [];
      const tag = labelNodes.find((x) => x?.name)?.name?.trim() ?? null;
      const createdAt = new Date(issue.createdAt).getTime();
      const updatedAt = new Date(issue.updatedAt).getTime();

      tasks.push({
        id: taskIdForIssue(issue.identifier),
        projectId: pid,
        ticket: issue.identifier,
        title: issue.title,
        tag,
        archivedAt: null,
        completedAt: null,
        createdAt: Number.isFinite(createdAt) ? createdAt : now,
        updatedAt: Number.isFinite(updatedAt) ? updatedAt : now,
        integrationId: this.id,
        priority: mapLinearPriority(issue.priority),
        externalUrl: buildExternalUrl({
          source: "linear",
          ticket: issue.identifier,
          workspace,
        }),
      });
    }

    noteSync(this.id);
    return { projects, tasks };
  }

  override fetchActivity(): FillSuggestion[] {
    return [
      {
        id: "linear_act_1",
        at: "10:42",
        src: "Linear",
        label: "Recent Linear activity",
        meta: "Fill suggestions",
        confidence: 0.78,
        picked: false,
        durationMinutes: 15,
      },
    ];
  }
}
