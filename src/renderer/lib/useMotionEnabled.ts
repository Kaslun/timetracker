/**
 * Single hook every component should consult before it animates.
 *
 * Returns `false` when the OS reports prefers-reduced-motion. Callers should
 * skip decorative transitions entirely (no fade, no slide, just a state swap)
 * — essential state still updates, only the dressing is removed.
 */
import { useReducedMotion } from "framer-motion";

export function useMotionEnabled(): boolean {
  const reduced = useReducedMotion();
  return !reduced;
}
