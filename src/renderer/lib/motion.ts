/**
 * Centralized motion tokens.
 *
 * All durations, easings and spring presets live here so we never sprinkle
 * magic numbers through the components. Keep this small and stable; if a
 * timing isn't reusable, it shouldn't graduate here.
 *
 * Honoring `prefers-reduced-motion` is the caller's job — see
 * `useMotionEnabled` for the standard hook used at component boundaries.
 */
import type { Transition, Variants } from "framer-motion";

/** Decorative motion (state morphs, slides, pop-ins). Hard cap. */
export const DUR = {
  /** State morphs (icon swaps, badge bumps). */
  fast: 0.15,
  /** Generic transitions (tabs, fades). */
  base: 0.2,
  /** Larger entrances (window resize, modal slides). */
  slow: 0.25,
  /** Brief celebration pulses (ring complete). */
  pulse: 0.4,
} as const;

/** Spring presets tuned to feel snappy without overshoot. */
export const SPRING = {
  /** Default motion for object position/layout. */
  snap: { type: "spring", stiffness: 400, damping: 30 } as const,
  /** A bit softer for badge bumps. */
  soft: { type: "spring", stiffness: 320, damping: 24 } as const,
} as const;

/** Linear progress fills (data-driven, not decorative). */
export const LINEAR: Transition = { duration: DUR.slow, ease: "linear" };

export const EASE_OUT: Transition = { duration: DUR.base, ease: "easeOut" };

/** Reusable variant set for vertical slide-in (8px) + fade. */
export const slideDown8: Variants = {
  hidden: { opacity: 0, y: -8 },
  shown: { opacity: 1, y: 0 },
};

/** Reusable variant set for digit-roll ticking. */
export const digitRoll: Variants = {
  enter: { y: "-100%", opacity: 0 },
  center: { y: 0, opacity: 1 },
  exit: { y: "100%", opacity: 0 },
};
