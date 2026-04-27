import { tags } from "../db/repos";
import { register } from "./handlers";
import { broadcast } from "./events";

export function registerTags(): void {
  register("tag:list", () => tags.list());
  register("tag:create", ({ label }) => {
    const created = tags.create(label);
    broadcast("tags:changed", tags.list());
    return created;
  });
  register("tag:delete", ({ id }) => {
    tags.delete(id);
    broadcast("tags:changed", tags.list());
  });
}
