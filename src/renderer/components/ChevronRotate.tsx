import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import { SPRING } from "@/lib/motion";
import { useMotionEnabled } from "@/lib/useMotionEnabled";

interface ChevronRotateProps {
  /** When true, chevron rotates to its "open"/"expanded" position. */
  open: boolean;
  /** Glyph size in px. */
  s?: number;
  /** Rotation angle when `open` (degrees). Default 180. */
  openAngle?: number;
  /** Rotation angle when collapsed (degrees). Default 0. */
  closedAngle?: number;
  style?: CSSProperties;
}

/**
 * Chevron with a 200ms spring rotation between two angles.
 *
 * Used by the pill expand/collapse button. When the window enters expanded
 * mode the chevron rotates to `openAngle`; springs back on collapse. Reduced
 * motion: snap, no animation.
 */
export function ChevronRotate({
  open,
  s = 14,
  openAngle = 180,
  closedAngle = 0,
  style,
}: ChevronRotateProps) {
  const motionOn = useMotionEnabled();
  const rotate = open ? openAngle : closedAngle;

  return (
    <motion.svg
      width={s}
      height={s}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      animate={{ rotate }}
      transition={motionOn ? SPRING.snap : { duration: 0 }}
      style={{ ...style }}
    >
      <path d="M4 6l4 4 4-4" />
    </motion.svg>
  );
}
