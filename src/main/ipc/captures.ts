import { captures } from "../db/repos";
import { register } from "./handlers";
import { broadcastChanges } from "./broadcast";

export function registerCaptures(): void {
  register("capture:create", (input) => {
    const c = captures.create(input);
    broadcastChanges({ captures: true });
    return c;
  });
  register("capture:list", (input) => captures.list(input?.limit));
  register("capture:tag", ({ id, tag }) => {
    captures.tag(id, tag);
    broadcastChanges({ captures: true });
  });
  register("capture:archive", ({ id }) => {
    captures.archive(id);
    broadcastChanges({ captures: true });
  });
}
