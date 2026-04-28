/**
 * Track a DOM element's content-box width via `ResizeObserver`.
 *
 * Round 4 introduced per-window breakpoints (compact / default / wide). The
 * windows can be resized down to small minimums and up to fullscreen, so we
 * can't rely on viewport CSS media queries — we measure the actual container.
 *
 * Returns a `[ref, width]` tuple. The ref attaches to whatever element you
 * want to measure (typically the window root); width is the latest measured
 * `contentRect.width` in CSS pixels, or 0 before the observer has fired.
 *
 * The observer is shared by ref so attaching/detaching is cheap; calling code
 * doesn't need to memoise.
 */
import { useEffect, useRef, useState } from "react";
import { classifyWidth, type Breakpoint } from "./breakpoints";

export type { Breakpoint } from "./breakpoints";

export function useContainerWidth<T extends HTMLElement = HTMLDivElement>(): {
  ref: React.RefObject<T | null>;
  width: number;
  breakpoint: Breakpoint;
} {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // contentBoxSize is a TypedArray-like iterable in modern browsers;
        // fall back to contentRect.width for older engines.
        const w = entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
        setWidth(Math.round(w));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, width, breakpoint: classifyWidth(width) };
}
