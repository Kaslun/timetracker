import { describe, expect, it } from "vitest";
import { classifyWidth } from "../../src/renderer/lib/breakpoints";

describe("classifyWidth", () => {
  it("treats the pre-measure 0 as default to avoid layout flash", () => {
    expect(classifyWidth(0)).toBe("default");
  });

  it("returns compact below 520px", () => {
    expect(classifyWidth(360)).toBe("compact");
    expect(classifyWidth(519)).toBe("compact");
  });

  it("returns default in the 520-820 band (inclusive)", () => {
    expect(classifyWidth(520)).toBe("default");
    expect(classifyWidth(700)).toBe("default");
    expect(classifyWidth(820)).toBe("default");
  });

  it("returns wide above 820px", () => {
    expect(classifyWidth(821)).toBe("wide");
    expect(classifyWidth(1920)).toBe("wide");
  });
});
