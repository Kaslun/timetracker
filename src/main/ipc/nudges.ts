import { nudges, tasks, entries } from "../db/repos";
import { getActiveNudge, clearNudge } from "../services/idle";
import { getFillSuggestions } from "../services/fillSuggestions";
import { broadcastChanges } from "./broadcast";
import { register } from "./handlers";

const MS_PER_MIN = 60_000;

export function registerNudges(): void {
  register("nudge:dismiss", ({ kind }) => {
    nudges.dismissed(kind);
    if (kind === "idle_recover" || kind === "retro_fill") clearNudge(kind);
  });

  register("nudge:active", ({ kind }) => getActiveNudge(kind));

  register("idle:resolve", ({ choice, gapStartedAt, gapEndedAt, taskId }) => {
    if (choice === "discard") {
      nudges.dismissed("idle_recover");
      clearNudge("idle_recover");
      return;
    }
    if (choice === "meeting") {
      const all = tasks.list();
      const target = all.find((t) => t.tag === "meet") ?? all[0];
      if (target) {
        entries.insert({
          taskId: taskId ?? target.id,
          startedAt: gapStartedAt,
          endedAt: gapEndedAt,
          source: "idle_recover",
        });
      }
    } else if (choice === "keep") {
      if (taskId) {
        entries.insert({
          taskId,
          startedAt: gapStartedAt,
          endedAt: gapEndedAt,
          source: "idle_recover",
        });
      }
    }
    // 'custom' is handled by the renderer issuing follow-up entry:insert calls.
    nudges.dismissed("idle_recover");
    clearNudge("idle_recover");
    broadcastChanges({ tasks: true, entries: true });
  });

  register("fill:suggestions", () => getFillSuggestions());
  register("fill:apply", ({ suggestions }) => {
    let inserted = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Fall back to the user's most recently used task when an integration
    // suggestion has no concrete `taskId` — silently skipping (the previous
    // behavior) hid every fill attempt and made the timeline feel broken.
    const fallback = tasks.list()[0]?.id ?? null;
    for (const s of suggestions) {
      const taskId = s.taskId ?? fallback;
      if (!taskId) continue;
      const [hh, mm] = s.at.split(":").map(Number);
      const startedAt = new Date(today);
      startedAt.setHours(hh ?? 0, mm ?? 0, 0, 0);
      const endedAt = new Date(
        startedAt.getTime() + s.durationMinutes * MS_PER_MIN,
      );
      entries.insert({
        taskId,
        startedAt: startedAt.getTime(),
        endedAt: endedAt.getTime(),
        source: "fill",
      });
      inserted++;
    }
    broadcastChanges({ tasks: true, entries: true });
    return { inserted };
  });
}
