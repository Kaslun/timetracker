/**
 * Centralised display component for `mm:ss` / `hh:mm:ss` style timers.
 *
 * The mono font's colon glyph is baseline-aligned but the digits are taller,
 * so a literal `47:12` reads with the colon visually anchored at the baseline
 * and the eye perceives it as "low". We bump every colon up by a small amount
 * (`COLON_LIFT`) so it lands optically centred between the digits.
 *
 * The shift lives in one place so we only have to retune it once when the
 * font ships a new release. Every six themes have been spot-checked at the
 * default value — the perceived shift varies a hair with weight but the
 * `0.08em` value is the right mid-point.
 *
 * Use this component everywhere a duration is rendered: pill cockpit, expanded
 * header, sprint countdown, dashboard totals, timeline tooltips. Anything
 * formatted by `formatElapsed`/`formatHM`/`clockTime` is a candidate.
 */
import type { CSSProperties, JSX } from "react";

const COLON_LIFT = "-0.08em";

interface TimeDisplayProps {
  /** Pre-formatted duration string, e.g. `"47:12"` or `"1:23:45"`. */
  value: string;
  /** Wrapper element. Defaults to `span` so it slots inline. */
  as?: "span" | "div";
  className?: string;
  style?: CSSProperties;
  /** Extra tabular-nums style. Defaults to true so widths don't shimmer. */
  tabular?: boolean;
  /**
   * `aria-label` override. Screen readers don't need the colon-tweak markup —
   * by default we read out the raw `value` string so e.g. `47:12` is announced
   * as the underlying digits, not "forty seven colon twelve".
   */
  ariaLabel?: string;
}

/**
 * Render a duration string with optically-centred colons.
 *
 * Renders each colon inside a `span` shifted up by `COLON_LIFT`. Digits and
 * separators (e.g. ` `, `h`, `m`, `s`) render unchanged so consumers can pass
 * either `47:12`, `1:23:45`, or `2h 15m`. The shift is invisible to anything
 * that doesn't contain a `:`.
 */
export function TimeDisplay({
  value,
  as: Tag = "span",
  className,
  style,
  tabular = true,
  ariaLabel,
}: TimeDisplayProps): JSX.Element {
  const segments = splitOnColons(value);
  const baseStyle: CSSProperties = {
    fontVariantNumeric: tabular ? "tabular-nums" : undefined,
    fontFeatureSettings: tabular ? '"tnum"' : undefined,
    ...style,
  };
  return (
    <Tag
      className={className}
      style={baseStyle}
      aria-label={ariaLabel ?? value}
    >
      {segments.map((seg, i) =>
        seg === ":" ? (
          <span
            key={i}
            aria-hidden="true"
            style={{
              display: "inline-block",
              transform: `translateY(${COLON_LIFT})`,
            }}
          >
            :
          </span>
        ) : (
          <span key={i}>{seg}</span>
        ),
      )}
    </Tag>
  );
}

/**
 * Split a duration string into a flat array where every `:` is its own entry.
 * `"47:12"` → `["47", ":", "12"]`. Strings without colons return as-is.
 */
function splitOnColons(value: string): string[] {
  if (!value.includes(":")) return [value];
  const out: string[] = [];
  let buf = "";
  for (const ch of value) {
    if (ch === ":") {
      if (buf) out.push(buf);
      out.push(":");
      buf = "";
    } else {
      buf += ch;
    }
  }
  if (buf) out.push(buf);
  return out;
}
