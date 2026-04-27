import { BaseProvider } from "./base";

export class JiraProvider extends BaseProvider {
  readonly id = "jira" as const;
  readonly meta = {
    label: "Jira",
    meta: "tickets · epics",
    bg: "#2684ff",
    letter: "J",
  };
}
