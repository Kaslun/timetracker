import type { IntegrationProvider } from "../types";
import { LinearProvider } from "./linear";
import { JiraProvider } from "./jira";
import { AsanaProvider } from "./asana";
import { SlackProvider } from "./slack";
import { TeamsProvider } from "./teams";
import { GitHubProvider } from "./github";
import { GCalProvider } from "./gcal";
import { NotionProvider } from "./notion";

/**
 * Ordered list of every provider the app knows about.
 *
 * The order doubles as the rendering order in Settings → Integrations and
 * the first-run intro grid, so keep the most useful ones on top.
 */
export const PROVIDERS: IntegrationProvider[] = [
  new LinearProvider(),
  new JiraProvider(),
  new AsanaProvider(),
  new SlackProvider(),
  new TeamsProvider(),
  new GitHubProvider(),
  new GCalProvider(),
  new NotionProvider(),
];
