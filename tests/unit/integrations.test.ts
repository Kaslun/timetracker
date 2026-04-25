import { describe, expect, it } from "vitest";
import {
  SERVICES,
  type ServiceMeta,
} from "../../src/renderer/lib/integrations";

describe("SERVICES", () => {
  it("exports a non-empty array", () => {
    expect(Array.isArray(SERVICES)).toBe(true);
    expect(SERVICES.length).toBeGreaterThan(0);
  });

  it("every entry has the required ServiceMeta fields", () => {
    for (const s of SERVICES as ServiceMeta[]) {
      expect(typeof s.id).toBe("string");
      expect(typeof s.label).toBe("string");
      expect(typeof s.bg).toBe("string");
      expect(typeof s.letter).toBe("string");
      expect(typeof s.meta).toBe("string");
    }
  });

  it("ids are unique", () => {
    const ids = SERVICES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
