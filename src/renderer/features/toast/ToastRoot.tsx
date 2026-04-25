import { toastKind } from "@/lib/api";
import { IdleRecoveryToast } from "./IdleRecoveryToast";
import { RetroFillToast } from "./RetroFillToast";
import { SlackToast } from "./SlackToast";
import { TeamsToast } from "./TeamsToast";

export function ToastRoot() {
  const kind = toastKind();
  switch (kind) {
    case "idle_recover":
      return <IdleRecoveryToast />;
    case "retro_fill":
      return <RetroFillToast />;
    case "slack":
      return <SlackToast />;
    case "teams":
      return <TeamsToast />;
    default:
      return null;
  }
}
