import { AnimatePresence, motion } from "framer-motion";
import { ExpandedRoot } from "@/features/expanded/ExpandedRoot";
import { PillRoot } from "@/features/pill/PillRoot";
import { useStore } from "@/store";
import { useMotionEnabled } from "@/lib/useMotionEnabled";

/**
 * Single-window morph between pill and expanded.
 *
 * The pill BrowserWindow renders this root. Main process toggles the
 * `pillMode` Zustand state via `pill:mode`; we crossfade content here while
 * the chrome (window bounds, alwaysOnTop, etc.) is animated by the main
 * process side. Pill content fades out fast (100ms) so the expanded view
 * arrives without overlap; expanded fades in over 150ms. Reduced-motion
 * users see an instant swap.
 */
export function MorphRoot() {
  const mode = useStore((s) => s.pillMode);
  const motionOn = useMotionEnabled();

  return (
    <AnimatePresence mode="wait" initial={false}>
      {mode === "pill" ? (
        <motion.div
          key="pill"
          initial={motionOn ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          exit={motionOn ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: motionOn ? 0.1 : 0, ease: "easeOut" }}
          style={{ height: "100%", display: "flex", flexDirection: "column" }}
        >
          <PillRoot />
        </motion.div>
      ) : (
        <motion.div
          key="expanded"
          initial={motionOn ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          exit={motionOn ? { opacity: 0 } : { opacity: 0 }}
          transition={{
            duration: motionOn ? 0.15 : 0,
            ease: "easeOut",
            delay: motionOn ? 0.05 : 0,
          }}
          style={{ height: "100%", display: "flex", flexDirection: "column" }}
        >
          <ExpandedRoot />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
