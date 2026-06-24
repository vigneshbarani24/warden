"use client";

import { useEffect, useState, useRef } from "react";

// The real cluster: two active-active endpoints + a witness region that votes on commits
// for the quorum without serving the read path. Matches the provisioned cluster exactly.
const regions = [
  { name: "us-east-1", role: "active-active region", status: "active" },
  { name: "us-west-2", role: "active-active region", status: "active" },
  { name: "us-east-2", role: "witness · commit quorum", status: "witness" },
];

export function InfrastructureSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeRegion, setActiveRegion] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveRegion((prev) => (prev + 1) % regions.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="infra" ref={sectionRef} className="relative py-24 lg:py-32 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="mb-20">
          <span className={`inline-flex items-center gap-4 text-sm font-mono text-muted-foreground mb-8 transition-all duration-700 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}>
            <span className="w-12 h-px bg-foreground/30" />
            Aurora DSQL
          </span>

          <div className="grid lg:grid-cols-[auto_1fr] gap-8 lg:gap-16 items-stretch">
            {/* Retinted dots/lines structural panel — replaces the world-sphere image */}
            <div className={`w-48 lg:w-72 xl:w-80 shrink-0 transition-all duration-1000 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}>
              <div className="relative h-full min-h-[12rem] border border-foreground/10 bg-foreground/[0.02] overflow-hidden">
                <svg
                  className="absolute inset-0 w-full h-full"
                  style={{ pointerEvents: "none" }}
                  aria-hidden="true"
                >
                  <defs>
                    <style>{`
                      @keyframes drawNode {
                        0%   { stroke-dashoffset: 600; opacity: 0; }
                        20%  { opacity: 1; }
                        70%  { opacity: 0.6; }
                        100% { stroke-dashoffset: 0; opacity: 0; }
                      }
                      .node-line {
                        stroke: rgba(110,29,36,0.55);
                        stroke-width: 1.2;
                        fill: none;
                        stroke-dasharray: 600;
                        animation: drawNode 3.2s ease-in-out infinite;
                      }
                    `}</style>
                  </defs>
                  {[...Array(11)].map((_, i) => {
                    const x1 = 18 + (i % 3) * 32;
                    const y1 = 14 + Math.floor(i / 3) * 26;
                    const x2 = 18 + ((i + 1) % 3) * 32;
                    const y2 = 14 + Math.floor((i + 1) / 3) * 26;
                    return (
                      <line
                        key={`node-line-${i}`}
                        x1={`${x1}%`}
                        y1={`${y1}%`}
                        x2={`${x2}%`}
                        y2={`${y2}%`}
                        className="node-line"
                        style={{ animationDelay: `${i * 0.2}s` }}
                      />
                    );
                  })}
                </svg>
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1.5 h-1.5 rounded-full bg-primary"
                    style={{
                      left: `${18 + (i % 3) * 32}%`,
                      top: `${14 + Math.floor(i / 3) * 26}%`,
                      animation: `pulse 2s ease-in-out ${i * 0.12}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Heading + lead, stacked */}
            <div className="flex flex-col justify-center">
              <h2 className={`text-4xl md:text-5xl lg:text-7xl font-display tracking-tight leading-[0.9] transition-all duration-1000 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}>
                Strong consistency,
                <br />
                <span className="text-muted-foreground">by default.</span>
              </h2>

              <p className={`mt-8 text-xl text-muted-foreground leading-relaxed max-w-lg transition-all duration-1000 delay-100 ${
                isVisible ? "opacity-100" : "opacity-0"
              }`}>
                Active-active across regions, strongly consistent, zero replication lag on commit.
                Revoke an authority grant in one region and every region denies the next action —
                instantly. No stale read ever approves on a revoked grant.
              </p>
            </div>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Large stat card */}
          <div className={`lg:col-span-2 relative p-8 lg:p-12 border border-foreground/10 bg-foreground/[0.02] overflow-hidden transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}>
            {/* Animated dots background with connecting lines — retinted to seal */}
            <div className="absolute inset-0 opacity-70">
              <svg
                className="absolute inset-0 w-full h-full"
                style={{ pointerEvents: "none" }}
                aria-hidden="true"
              >
                <defs>
                  <style>{`
                    @keyframes drawLine {
                      0%   { stroke-dashoffset: 1000; opacity: 0; }
                      15%  { opacity: 1; }
                      70%  { opacity: 0.7; }
                      100% { stroke-dashoffset: 0; opacity: 0; }
                    }
                    .connecting-line {
                      stroke: rgba(110,29,36,0.45);
                      stroke-width: 1.2;
                      fill: none;
                      stroke-dasharray: 1000;
                      animation: drawLine 3s ease-in-out infinite;
                    }
                  `}</style>
                </defs>
                {[...Array(19)].map((_, i) => {
                  const x1 = 10 + (i % 5) * 20;
                  const y1 = 10 + Math.floor(i / 5) * 25;
                  const x2 = 10 + ((i + 1) % 5) * 20;
                  const y2 = 10 + Math.floor((i + 1) / 5) * 25;
                  return (
                    <line
                      key={`line-${i}`}
                      x1={`${x1}%`}
                      y1={`${y1}%`}
                      x2={`${x2}%`}
                      y2={`${y2}%`}
                      className="connecting-line"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  );
                })}
              </svg>

              {/* Dots — seal */}
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full bg-primary"
                  style={{
                    left: `${10 + (i % 5) * 20}%`,
                    top: `${10 + Math.floor(i / 5) * 25}%`,
                    animation: `pulse 2s ease-in-out ${i * 0.1}s infinite`,
                  }}
                />
              ))}
            </div>

            <div className="relative z-10">
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-7xl lg:text-9xl font-display leading-none">2</span>
                <span className="text-2xl text-muted-foreground">active-active regions + witness</span>
              </div>
              <p className="text-muted-foreground max-w-md">
                us-east-1 and us-west-2 both serve reads and writes and stay strongly consistent.
                Revoke a grant in one and the next decision in the other denies instantly —
                demonstrated live in the console, no stale read ever approves a revoked grant.
              </p>
            </div>
          </div>

          {/* Stacked stat cards */}
          <div className="flex flex-col gap-6">
            <div className={`p-8 border border-foreground/10 bg-foreground/[0.02] transition-all duration-700 delay-100 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}>
              <span className="text-5xl lg:text-6xl font-display">99.999%</span>
              <span className="block text-sm text-muted-foreground mt-2">multi-region SLA</span>
            </div>

            <div className={`p-8 border border-foreground/10 bg-foreground/[0.02] transition-all duration-700 delay-200 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}>
              <span className="text-5xl lg:text-6xl font-display">0</span>
              <span className="block text-sm text-muted-foreground mt-2">stale approvals</span>
            </div>
          </div>
        </div>

        {/* Region list */}
        <div className={`mt-12 grid grid-cols-2 lg:grid-cols-3 gap-4 transition-all duration-1000 delay-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}>
          {regions.map((region, index) => (
            <div
              key={region.name}
              className={`p-6 border transition-all duration-300 cursor-default ${
                activeRegion === index
                  ? "border-foreground/30 bg-foreground/[0.04]"
                  : "border-foreground/10"
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-2 h-2 rounded-full transition-colors ${
                  region.status === "active"
                    ? "bg-allow"
                    : activeRegion === index
                      ? "bg-primary"
                      : "bg-foreground/25"
                }`} />
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
        <div className={`mt-8 border-l-2 border-primary/40 pl-5 py-2 transition-all duration-1000 delay-500 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}>
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
