import { BaseProvider } from "./base";

export class AsanaProvider extends BaseProvider {
  readonly id = "asana" as const;
  readonly meta = {
    label: "Asana",
    meta: "tasks · projects",
    bg: "#f06a6a",
    letter: "A",
  };
}
