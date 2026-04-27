import { db, newId } from "../index";

export interface CustomTag {
  id: string;
  label: string;
  createdAt: number;
}

interface Row {
  id: string;
  label: string;
  created_at: number;
}

const map = (r: Row): CustomTag => ({
  id: r.id,
  label: r.label,
  createdAt: r.created_at,
});

function normalize(input: string): string {
  const trimmed = input.trim().replace(/\s+/g, "-");
  if (!trimmed) return "";
  return trimmed.startsWith("#")
    ? trimmed.toLowerCase()
    : `#${trimmed.toLowerCase()}`;
}

export const tags = {
  list(): CustomTag[] {
    const rows = db()
      .prepare("SELECT * FROM custom_tags ORDER BY created_at ASC")
      .all() as Row[];
    return rows.map(map);
  },

  create(label: string): CustomTag {
    const normalized = normalize(label);
    if (!normalized) throw new Error("Tag label is empty");
    const existing = db()
      .prepare("SELECT * FROM custom_tags WHERE label = ?")
      .get(normalized) as Row | undefined;
    if (existing) return map(existing);
    const row: CustomTag = {
      id: newId("tag"),
      label: normalized,
      createdAt: Date.now(),
    };
    db()
      .prepare(
        "INSERT INTO custom_tags (id, label, created_at) VALUES (@id, @label, @createdAt)",
      )
      .run(row);
    return row;
  },

  delete(id: string): void {
    db().prepare("DELETE FROM custom_tags WHERE id = ?").run(id);
  },
};
