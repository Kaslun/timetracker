import { entries, tasks, projects } from "../db/repos";
import { register } from "./handlers";
import { broadcastChanges } from "./broadcast";

export function registerTimer(): void {
  register("task:start", ({ taskId }) => {
    entries.start({ taskId });
    broadcastChanges({ current: true, tasks: true, entries: true });
    return entries.currentView();
  });

  register("task:pause", () => {
    entries.pause();
    broadcastChanges({ current: true, tasks: true, entries: true });
    return entries.currentView();
  });

  register("task:toggle", () => {
    const cur = entries.open();
    if (cur) entries.pause();
    else {
      // Resume the most-touched task today (or the first task if none).
      const list = tasks.listWithStats();
      const target = list.find((t) => t.todaySec > 0) ?? list[0];
      if (target) entries.start({ taskId: target.id });
    }
    broadcastChanges({ current: true, tasks: true, entries: true });
    return entries.currentView();
  });

  register("task:switch", ({ taskId }) => {
    entries.start({ taskId });
    broadcastChanges({ current: true, tasks: true, entries: true });
    return entries.currentView();
  });

  register("task:current", () => entries.currentView());
  register("task:list", () => tasks.listWithStats());

  register("task:create", (input) => {
    const created = tasks.create(input);
    broadcastChanges({ tasks: true });
    return created;
  });
  register("task:archive", ({ id }) => {
    tasks.archive(id);
    broadcastChanges({ tasks: true, entries: true });
  });

  register("entry:list", (input) => entries.list(input));
  register("entry:update", ({ id, patch }) => {
    entries.update(id, patch);
    broadcastChanges({ current: true, tasks: true, entries: true });
  });
  register("entry:delete", ({ id }) => {
    entries.delete(id);
    broadcastChanges({ current: true, tasks: true, entries: true });
  });
  register("entry:insert", (input) => {
    const e = entries.insert(input);
    broadcastChanges({ tasks: true, entries: true });
    return e;
  });

  register("project:list", () => projects.list());
}
