import { BaseProvider } from "./base";

export class NotionProvider extends BaseProvider {
  readonly id = "notion" as const;
  readonly meta = {
    label: "Notion",
    meta: "docs · databases",
    bg: "#111111",
    letter: "N",
  };
}
