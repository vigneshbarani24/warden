"use client";

import { useEffect, useRef, useState } from "react";

// Three honest values from the seeded CTRM demo, rendered as a quiet ledger-style
// stat strip. The data IS the type: every value is JetBrains Mono, tabular.
const stats = [
  {
    value: "0",
    label: "Stale approvals",
    detail: "no revoked grant ever approved",
    animate: true,
  },
  {
    value: "100%",
    label: "Verdicts sealed",
    detail: "every decision hash-chained",
    animate: false,
  },
  {
    value: "2",
    label: "Active-active regions",
    detail: "strongly consistent, plus a witness",
    animate: false,
  },
] as const;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// The single sanctioned settle on this surface: the "0 stale approvals" count
// lands on its value once, in view. Reduced motion shows the final value at once.
function SettleZero(): React.ReactElement {
  const [settled, setSettled] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setSettled(true);
      return;
    }
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setSettled(true);
          observer.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <span
      ref={ref}
      className="font-mono-display inline-block"
      style={{
        opacity: settled ? 1 : 0,
        transform: settled ? "translateY(0)" : "translateY(0.18em)",
        transition: "opacity 600ms ease, transform 600ms cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      0
    </span>
  );
}

export function MetricsSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 },
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-24 lg:py-32">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="mb-16 lg:mb-20">
          <span
            className={`inline-flex items-center gap-4 font-mono text-sm text-muted-foreground mb-8 transition-all duration-700 ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <span className="h-px w-12 bg-foreground/30" />
            On the record
          </span>

          <h2 className="warden-display warden-display-xl max-w-3xl">
            Three numbers
            <br />
            <span className="text-muted-foreground">we will defend.</span>
          </h2>

          <p className="mt-6 font-mono text-sm text-muted-foreground">
            Illustrative — drawn from the seeded CTRM demo.
          </p>
        </div>

        {/* Ledger-style stat strip — hairline-ruled rows, all values mono */}
        <div className="border-t border-foreground/15">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={`grid grid-cols-[auto_1fr] items-baseline gap-x-8 gap-y-1 border-b border-foreground/15 py-8 transition-all duration-700 lg:grid-cols-[14rem_1fr_auto] lg:gap-x-12 lg:py-10 ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
              style={{ transitionDelay: `${index * 90}ms` }}
            >
              <div className="font-mono-display text-5xl leading-none text-foreground lg:text-7xl">
                {stat.animate ? <SettleZero /> : stat.value}
              </div>
              <div className="col-span-1 text-lg text-foreground lg:text-xl">
                {stat.label}
              </div>
              <div className="col-span-2 font-mono text-sm text-muted-foreground lg:col-span-1 lg:text-right">
                {stat.detail}
              </div>
            </div>
          ))}
        </div>

        {/* The contract reach — any agent that POSTs */}
        <div
          className={`mt-12 flex flex-wrap items-center gap-x-10 gap-y-3 font-mono text-sm text-muted-foreground transition-all duration-700 delay-300 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <span>LangGraph</span>
          <span>CrewAI</span>
          <span>AWS AgentCore</span>
          <span>SAP Joule</span>
          <span className="text-foreground/60">+ any agent that POSTs the contract</span>
        </div>
      </div>
    </section>
  );
}
