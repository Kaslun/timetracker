import { IntegrationLinear } from "./IntegrationLinear";
import { integrationId } from "@/lib/api";

export function IntegrationRoot() {
  switch (integrationId()) {
    case "linear":
      return <IntegrationLinear />;
    default:
      return null;
  }
}
