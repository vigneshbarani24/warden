"use client";

/**
 * The verdict wax stamp — a debossed oxblood seal ring with the verdict pressed
 * into it in its semantic color, mono heavy, hand-stamped at ~-2deg, arriving via
 * a single scale-in (one of the two sanctioned motions).
 *
 * Dual-encoded by design: ring color + a glyph + the word, never hue alone — the
 * audience is colorblind finance/audit operators. Reduced motion drops the
 * scale-in (handled in globals.css) and shows the final stamp.
 *
 * Reusable on BOTH surfaces: it composes the `.warden-stamp*` classes from
 * globals.css, no module CSS. Pass `className` to size it in context.
 */

export type Verdict = "allow" | "deny" | "escalate";

export interface VerdictStampProps {
  verdict: Verdict;
  /** Override the displayed word (defaults to the verdict, uppercased by CSS). */
  label?: string;
  /** Extra classes for sizing/placement in the host surface. */
  className?: string;
}

// Glyph carries the verdict independent of color (the colorblind-safe channel).
const GLYPH: Record<Verdict, string> = {
  allow: "✓",
  deny: "✕",
  escalate: "▲",
};

const VARIANT: Record<Verdict, string> = {
  allow: "warden-stamp-allow",
  deny: "warden-stamp-deny",
  escalate: "warden-stamp-escalate",
};

export function VerdictStamp({ verdict, label, className }: VerdictStampProps): React.ReactElement {
  const word = label ?? verdict;
  return (
    <span
      className={`warden-stamp ${VARIANT[verdict]}${className ? ` ${className}` : ""}`}
      role="img"
      aria-label={`Verdict: ${word}`}
    >
      <span className="warden-stamp__glyph" aria-hidden="true">
        {GLYPH[verdict]}
      </span>
      <span className="warden-stamp__word">{word}</span>
    </span>
  );
}
