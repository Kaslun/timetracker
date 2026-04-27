import { describe, expect, it } from "vitest";
import { DEFAULT_TAGS, normalizeTagLabel } from "../../src/renderer/lib/tags";

describe("normalizeTagLabel", () => {
  it("lowercases and prefixes a hash", () => {
    expect(normalizeTagLabel("Bug")).toBe("#bug");
    expect(normalizeTagLabel("DESIGN")).toBe("#design");
  });

  it("strips redundant leading hashes", () => {
    expect(normalizeTagLabel("##idea")).toBe("#idea");
    expect(normalizeTagLabel("#ask")).toBe("#ask");
  });

  it("collapses whitespace and special chars to dashes", () => {
    expect(normalizeTagLabel("  follow up  ")).toBe("#follow-up");
    expect(normalizeTagLabel("write & ship!")).toBe("#write-ship");
  });

  it("trims dashes at the boundaries", () => {
    expect(normalizeTagLabel("--prep--")).toBe("#prep");
    expect(normalizeTagLabel("___edge___")).toBe("#edge");
  });

  it("returns an empty string when nothing usable is left", () => {
    expect(normalizeTagLabel("   ")).toBe("");
    expect(normalizeTagLabel("###")).toBe("");
    expect(normalizeTagLabel("$$$")).toBe("");
  });
});

describe("DEFAULT_TAGS", () => {
  it("contains the canonical brain-dump set used by both surfaces", () => {
    expect(DEFAULT_TAGS).toEqual([
      "#task",
      "#bug",
      "#idea",
      "#ask",
      "#design",
      "#write",
    ]);
  });
});
