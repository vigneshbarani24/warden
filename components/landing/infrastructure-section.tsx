"use client";

import { useEffect, useRef, useState } from "react";

// The real cluster: two active-active endpoints + a witness region that votes on commits
// for the quorum without serving the read path. Matches the provisioned cluster exactly.
const regions = [
  { name: "us-east-1", role: "active-active region", status: "active" },
  { name: "us-west-2", role: "active-active region", status: "active" },
  { name: "us-east-2", role: "witness · commit quorum", status: "witness" },
] as const;

// Static 3-node region diagram: two filled active nodes linked, one hollow witness
// above the quorum line. No motion — the topology is a fact, not an animation.
function RegionDiagram(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 200 160"
      className="h-full w-full"
      role="img"
      aria-label="Two active-active regions linked, with a witness region on the commit quorum"
    >
      {/* link between the two active regions */}
      <line x1="48" y1="118" x2="152" y2="118" stroke="var(--color-allow)" strokeWidth="1.5" />
      {/* witness ties to each active node (hairline) */}
      <line x1="100" y1="44" x2="48" y2="118" stroke="var(--border)" strokeWidth="1" />
      <line x1="100" y1="44" x2="152" y2="118" stroke="var(--border)" strokeWidth="1" />

      {/* witness — hollow */}
      <circle cx="100" cy="44" r="9" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5" />
      {/* active us-east-1 — filled allow */}
      <circle cx="48" cy="118" r="9" fill="var(--color-allow)" />
      {/* active us-west-2 — filled allow */}
      <circle cx="152" cy="118" r="9" fill="var(--color-allow)" />

      <text x="100" y="26" textAnchor="middle" className="fill-[var(--muted-foreground)] font-mono text-[8px]">
        witness
      </text>
      <text x="48" y="142" textAnchor="middle" className="fill-[var(--foreground)] font-mono text-[8px]">
        us-east-1
      </text>
      <text x="152" y="142" textAnchor="middle" className="fill-[var(--foreground)] font-mono text-[8px]">
        us-west-2
      </text>
    </svg>
  );
}

export function InfrastructureSection() {
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
    <section id="infra" ref={sectionRef} className="relative py-24 lg:py-32">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="mb-20">
          <span
            className={`inline-flex items-center gap-4 font-mono text-sm text-muted-foreground mb-8 transition-all duration-700 ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <span className="w-12 h-px bg-foreground/30" />
            Aurora DSQL
          </span>

          <div className="grid lg:grid-cols-[auto_1fr] gap-8 lg:gap-16 items-stretch">
            {/* Static region topology — replaces the animated dots/lines field */}
            <div
              className={`w-48 lg:w-72 xl:w-80 shrink-0 transition-all duration-1000 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              <div className="relative flex h-full min-h-[12rem] items-center justify-center border border-foreground/10 bg-foreground/[0.02] p-6">
                <RegionDiagram />
              </div>
            </div>

            {/* Heading + lead, stacked */}
            <div className="flex flex-col justify-center">
              <h2
                className={`warden-display warden-display-xl transition-all duration-1000 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
              >
                Strong consistency,
                <br />
                <span className="text-muted-foreground">by default.</span>
              </h2>

              <p
                className={`mt-8 text-xl text-muted-foreground leading-relaxed max-w-lg transition-all duration-1000 delay-100 ${
                  isVisible ? "opacity-100" : "opacity-0"
                }`}
              >
                Active-active across regions, strongly consistent, zero replication lag on commit.
                Revoke an authority grant in one region and every region denies the next action —
                instantly. No stale read ever approves on a revoked grant.
              </p>
            </div>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Large stat card — static */}
          <div
            className={`lg:col-span-2 relative p-8 lg:p-12 border border-foreground/10 bg-foreground/[0.02] transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="flex items-baseline gap-2 mb-4">
              <span className="font-mono-display text-7xl lg:text-9xl leading-none">2</span>
              <span className="text-2xl text-muted-foreground">active-active regions + witness</span>
            </div>
            <p className="text-muted-foreground max-w-md">
              us-east-1 and us-west-2 both serve reads and writes and stay strongly consistent.
              Revoke a grant in one and the next decision in the other denies instantly —
              demonstrated live in the console, no stale read ever approves a revoked grant.
            </p>
          </div>

          {/* Stacked stat cards */}
          <div className="flex flex-col gap-6">
            <div
              className={`p-8 border border-foreground/10 bg-foreground/[0.02] transition-all duration-700 delay-100 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              <span className="font-mono-display text-5xl lg:text-6xl">99.999%</span>
              <span className="block text-sm text-muted-foreground mt-2">multi-region SLA</span>
            </div>

            <div
              className={`p-8 border border-foreground/10 bg-foreground/[0.02] transition-all duration-700 delay-200 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              <span className="font-mono-display text-5xl lg:text-6xl">0</span>
              <span className="block text-sm text-muted-foreground mt-2">stale approvals</span>
            </div>
          </div>
        </div>

        {/* Region list — static, no auto-rotate highlight */}
        <div
          className={`mt-12 grid grid-cols-2 lg:grid-cols-3 gap-4 transition-all duration-1000 delay-300 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          {regions.map((region) => (
            <div key={region.name} className="p-6 border border-foreground/10">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`w-2 h-2 rounded-full ${
                    region.status === "active" ? "bg-allow" : "border border-muted-foreground"
                  }`}
                />
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  {region.status}
                </span>
              </div>
              <span className="font-mono font-medium block mb-1">{region.name}</span>
              <span className="text-sm text-muted-foreground">{region.role}</span>
            </div>
          ))}
        </div>

        {/* Mono callout — the DSQL-native engine guarantee */}
        <div
          className={`mt-8 border-l-2 border-primary/40 pl-5 py-2 transition-all duration-1000 delay-500 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <p className="font-mono text-xs lg:text-sm leading-relaxed text-muted-foreground max-w-3xl">
            No foreign keys, no sequences, optimistic concurrency. The engine locks the covering grant{" "}
            <span className="text-foreground">FOR UPDATE</span>, so a concurrent revoke conflicts at{" "}
            <span className="text-foreground">COMMIT</span> and re-evaluates against the revoked state.
          </p>
        </div>
      </div>
    </section>
  );
}
