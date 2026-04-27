import { useEffect, useState } from "react";
import { rpc, on } from "@/lib/api";
import { DEFAULT_TAGS, normalizeTagLabel, type CustomTag } from "@/lib/tags";

/**
 * Returns the unified tag list (defaults + persisted custom) and a
 * `createTag()` helper. Stays in sync with the `tags:changed` event so
 * a tag created in one surface immediately appears everywhere else.
 */
export function useTags(): {
  tags: string[];
  customTags: CustomTag[];
  createTag: (label: string) => Promise<string | null>;
} {
  const [custom, setCustom] = useState<CustomTag[]>([]);

  useEffect(() => {
    let cancelled = false;
    void rpc("tag:list").then((rows) => {
      if (!cancelled) setCustom(rows);
    });
    const off = on("tags:changed", (rows) => setCustom(rows));
    return () => {
      cancelled = true;
      off();
    };
  }, []);

  const tags = [...DEFAULT_TAGS, ...custom.map((c) => c.label)];

  const createTag = async (label: string): Promise<string | null> => {
    const norm = normalizeTagLabel(label);
    if (!norm) return null;
    if (tags.includes(norm)) return norm;
    const row = await rpc("tag:create", { label: norm });
    return row.label;
  };

  return { tags, customTags: custom, createTag };
}
