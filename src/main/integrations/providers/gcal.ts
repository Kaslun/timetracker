import { BaseProvider } from "./base";

export class GCalProvider extends BaseProvider {
  readonly id = "gcal" as const;
  readonly meta = {
    label: "Google Calendar",
    meta: "events · blocks",
    bg: "#4285f4",
    letter: "◎",
  };
}
