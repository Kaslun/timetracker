import { BaseProvider } from "./base";

export class GitHubProvider extends BaseProvider {
  readonly id = "github" as const;
  readonly meta = {
    label: "GitHub",
    meta: "PRs · commits",
    bg: "#1a1e22",
    letter: "◐",
  };
}
