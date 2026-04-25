import { integrationId } from "@/lib/api";
import { IntegrationLinear } from "./IntegrationLinear";

export function IntegrationRoot() {
  switch (integrationId()) {
    case "linear":
      return <IntegrationLinear />;
    default:
      return null;
  }
}
