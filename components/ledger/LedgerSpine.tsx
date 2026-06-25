"use client";

import { useEffect, useState } from "react";

/**
 * The sealed ledger chain — the ONE signature surface. A vertical spine of
 * oxblood wax discs (newest on top), each linked to the one above by a hairline.
 *
 * Self-contained and surface-agnostic: it styles itself entirely from globals.css
 * utility classes + CSS custom properties, so it renders identically on the
 * Tailwind landing and the CSS-Modules console. It does NOT import any module CSS.
 *
 * The two sanctioned states it animates:
 *   - verifying: a pass of light travels DOWN the spine, locking each disc green.
 *   - broken:    the break seq and every disc below it go red.
 * Reduced motion snaps to the final state (all green / all-from-break red at once),
 * never a duration-zero flicker.
 */

export interface LedgerBlock {
  seq: number;
  hash: string;
}

export interface LedgerSpineProps {
  blocks: LedgerBlock[];
  /** When set, this seq and every block below it render as a broken (red) seal. */
  breakAtSeq?: number | null;
  /** Run the verify pass: staggered light travels down the spine. */
  verifying?: boolean;
  /** Chain is confirmed intact — all discs settle green. */
  verified?: boolean;
  /** Smaller discs + tighter spacing for the landing/inline contexts. */
  compact?: boolean;
}

const shortHash = (h: string): string => (h.length > 10 ? `${h.slice(0, 10)}…` : h);
const seqLabel = (seq: number): string => String(seq).padStart(4, "0");

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function LedgerSpine({
  blocks,
  breakAtSeq = null,
  verifying = false,
  verified = false,
  compact = false,
}: LedgerSpineProps): React.ReactElement {
  // Gate the staggered lock animation behind reduced-motion. When reduced, the
  // final tint is applied with no per-disc delay (snap to final state).
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setReduced(prefersReducedMotion());
  }, []);

  // Newest on top. Sort a copy so callers can pass any order.
  const ordered = [...blocks].sort((a, b) => b.seq - a.seq);
  const broken = breakAtSeq != null;
  const highestSeq = ordered.length > 0 ? Math.max(...ordered.map((b) => b.seq)) : 0;

  const statusText = broken
    ? `Break detected at seq ${seqLabel(breakAtSeq)}`
    : verified
      ? `Chain intact through seq ${seqLabel(highestSeq)}`
      : verifying
        ? "Verifying chain…"
        : `${ordered.length} sealed`;

  const statusColor = broken
    ? "var(--color-deny)"
    : verified
      ? "var(--color-allow)"
      : "var(--muted-foreground)";

  // The verify pass travels TOP -> DOWN. Discs are rendered newest-first (top),
  // so the stagger index follows render order directly.
  const lockDelay = (renderIndex: number): number => (reduced ? 0 : renderIndex * 70);

  return (
    <div className={`warden-spine${compact ? " warden-spine-compact" : ""}`} role="list" aria-label="Ledger chain">
      {ordered.map((block, renderIndex) => {
        const isBroken = broken && block.seq >= (breakAtSeq as number);
        // While verifying (and not yet broken) the disc settles green; if the chain
        // is confirmed verified, all are green. A broken seq always wins to red.
        const settledGreen = !isBroken && (verified || verifying);
        const discState = isBroken
          ? "warden-disc-broken"
          : settledGreen
            ? "warden-disc-verified"
            : "";
        const locking = verifying && !reduced ? " warden-disc-locking" : "";

        return (
          <div className="warden-link" role="listitem" key={block.seq}>
            <div
              className={`warden-disc ${discState}${locking}`}
              style={locking ? { animationDelay: `${lockDelay(renderIndex)}ms` } : undefined}
              aria-hidden="true"
            >
              {seqLabel(block.seq)}
            </div>
            <div className="warden-link__meta">
              <span className="warden-link__seq">seq {seqLabel(block.seq)}</span>
              <span className="warden-link__hash">{shortHash(block.hash)}</span>
            </div>
          </div>
        );
      })}
      {ordered.length > 0 && (
        <div className="warden-spine__status" style={{ color: statusColor }}>
          {statusText}
        </div>
      )}
    </div>
  );
}
