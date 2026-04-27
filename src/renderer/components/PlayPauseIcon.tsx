import { AnimatePresence, motion } from "framer-motion";
import { DUR } from "@/lib/motion";
import { useMotionEnabled } from "@/lib/useMotionEnabled";

interface PlayPauseIconProps {
  running: boolean;
  size?: number;
}

/**
 * Play ↔ pause icon that crossfades between the two glyphs in 150ms.
 *
 * Path interpolation between a triangle and two bars is ugly, so we swap two
 * paths with a short fade. Uses `mode="popLayout"` to avoid pushing siblings
 * during the swap. Reduced motion: instant swap, no fade.
 */
export function PlayPauseIcon({ running, size = 14 }: PlayPauseIconProps) {
  const motionOn = useMotionEnabled();
  const key = running ? "pause" : "play";

  return (
    <span
      style={{
        display: "inline-flex",
        position: "relative",
        width: size,
        height: size,
        lineHeight: 0,
      }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.svg
          key={key}
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden="true"
          initial={motionOn ? { opacity: 0, scale: 0.85 } : false}
          animate={{ opacity: 1, scale: 1 }}
          exit={motionOn ? { opacity: 0, scale: 0.85 } : { opacity: 0 }}
          transition={{ duration: motionOn ? DUR.fast : 0, ease: "easeOut" }}
          style={{ position: "absolute", inset: 0 }}
        >
          {running ? (
            <>
              <rect x="4" y="3" width="3" height="10" rx="1" />
              <rect x="9" y="3" width="3" height="10" rx="1" />
            </>
          ) : (
            <path d="M4.5 3.2v9.6c0 .4.4.6.7.4l7.5-4.8a.5.5 0 0 0 0-.8L5.2 2.8a.5.5 0 0 0-.7.4Z" />
          )}
        </motion.svg>
      </AnimatePresence>
    </span>
  );
}
