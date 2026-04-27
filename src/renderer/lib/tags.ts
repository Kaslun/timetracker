/**
 * Shipped defaults — match the original pill brain-dump list and the
 * inbox tag set so the two surfaces always agree out of the box.
 */
export const DEFAULT_TAGS: readonly string[] = [
  "#task",
  "#bug",
  "#idea",
  "#ask",
  "#design",
  "#write",
] as const;

export interface CustomTag {
  id: string;
  label: string;
  createdAt: number;
}

/**
 * Normalize a free-text tag label to the same shape we persist:
 * lowercased, leading `#`, dashes for spaces, allowed chars `[a-z0-9-]`.
 * Returns `""` if no usable characters survive normalization.
 */
export function normalizeTagLabel(input: string): string {
  const trimmed = input.trim().toLowerCase();
  const stripped = trimmed.replace(/^#+/, "");
  const safe = stripped.replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  return safe ? `#${safe}` : "";
}
