import { BaseProvider } from "./base";

export class SlackProvider extends BaseProvider {
  readonly id = "slack" as const;
  readonly meta = {
    label: "Slack",
    meta: "status · DMs",
    bg: "#4a154b",
    letter: "#",
  };
}
