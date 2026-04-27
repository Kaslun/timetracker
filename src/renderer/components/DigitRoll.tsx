import { AnimatePresence, motion } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";
import { SPRING } from "@/lib/motion";
import { useMotionEnabled } from "@/lib/useMotionEnabled";

interface DigitRollProps {
  /** The string to display, e.g. "47:12". Each character animates independently. */
  value: string;
  /** Optional className applied to the wrapper (use to inherit `mono num` etc). */
  className?: string;
  style?: CSSProperties;
  /** Aria label override; defaults to `value`. */
  ariaLabel?: string;
}

/**
 * Render a string with per-character digit-roll animation.
 *
 * Each character lives inside its own AnimatePresence cell keyed by its value
 * — when the value changes, the old glyph slides up and the new one slides in
 * from below. Spring-back, so the motion is springy without overshoot. The
 * cell width is fixed by an invisible measurement glyph so layout never
 * thrashes during the swap.
 *
 * Only the digit that *changed* re-mounts; sibling cells are stable React
 * keys (positional index), so React reconciles the same `motion.span` and
 * Framer Motion sees a value change rather than a fresh mount.
 *
 * Reduced motion: render plain text.
 */
export function DigitRoll({
  value,
  className,
  style,
  ariaLabel,
}: DigitRollProps) {
  const motionOn = useMotionEnabled();
  const chars = Array.from(value);

  if (!motionOn) {
    return (
      <span className={className} style={style} aria-label={ariaLabel ?? value}>
        {value}
      </span>
    );
  }

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        ...style,
      }}
      aria-label={ariaLabel ?? value}
    >
      {chars.map((ch, i) => (
        <DigitCell key={i} char={ch} />
      ))}
    </span>
  );
}

function DigitCell({ char }: { char: string }) {
  // For non-digit separators (`:`, `.`, ` `) just render statically.
  const isDigit = /[0-9]/.test(char);

  if (!isDigit) {
    return (
      <span style={{ display: "inline-block", textAlign: "center" }}>
        {char}
      </span>
    );
  }

  return (
    <span
      style={{
        display: "inline-block",
        position: "relative",
        textAlign: "center",
        // The cell width is set by the invisible measurement glyph below.
        // Using "1ch" would also work, but breaks for proportional fonts.
        height: "1em",
        overflow: "hidden",
        verticalAlign: "baseline",
      }}
    >
      <span aria-hidden="true" style={{ visibility: "hidden" }}>
        0
      </span>
      <AnimatePresence mode="popLayout" initial={false}>
        <Glyph key={char}>{char}</Glyph>
      </AnimatePresence>
    </span>
  );
}

function Glyph({ children }: { children: ReactNode }) {
  return (
    <motion.span
      initial={{ y: "-100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={SPRING.soft}
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </motion.span>
  );
}
