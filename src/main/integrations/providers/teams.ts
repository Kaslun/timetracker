import { BaseProvider } from "./base";

export class TeamsProvider extends BaseProvider {
  readonly id = "teams" as const;
  readonly meta = {
    label: "Microsoft Teams",
    meta: "meetings · calls",
    bg: "#5059c9",
    letter: "T",
  };
}
