import { describe, expect, it } from "vitest";
import {
  DUR,
  EASE_OUT,
  LINEAR,
  SPRING,
  digitRoll,
  slideDown8,
} from "../../src/renderer/lib/motion";

describe("motion tokens", () => {
  it("durations are within the 250ms decorative cap", () => {
    expect(DUR.fast).toBeLessThanOrEqual(0.15);
    expect(DUR.base).toBeLessThanOrEqual(0.25);
    expect(DUR.slow).toBeLessThanOrEqual(0.25);
    expect(DUR.pulse).toBeLessThanOrEqual(0.4);
  });

  it("spring presets shape: stiffness + damping with type=spring", () => {
    expect(SPRING.snap.type).toBe("spring");
    expect(SPRING.snap.stiffness).toBeGreaterThan(0);
    expect(SPRING.snap.damping).toBeGreaterThan(0);
    expect(SPRING.soft.type).toBe("spring");
    expect(SPRING.soft.stiffness).toBeGreaterThan(0);
    expect(SPRING.soft.damping).toBeGreaterThan(0);
  });

  it("linear & easeOut presets carry duration + easing", () => {
    expect(LINEAR.duration).toBeGreaterThan(0);
    expect(LINEAR.ease).toBe("linear");
    expect(EASE_OUT.duration).toBeGreaterThan(0);
    expect(EASE_OUT.ease).toBe("easeOut");
  });

  it("variant maps expose the documented states", () => {
    expect(slideDown8.hidden).toMatchObject({ opacity: 0, y: -8 });
    expect(slideDown8.shown).toMatchObject({ opacity: 1, y: 0 });
    expect(digitRoll.center).toMatchObject({ y: 0, opacity: 1 });
    expect(digitRoll.enter.y).toBe("-100%");
    expect(digitRoll.exit.y).toBe("100%");
  });
});
