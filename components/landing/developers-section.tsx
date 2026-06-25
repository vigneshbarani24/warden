"use client";

import { useState, useEffect, useRef } from "react";

const features = [
  {
    title: "TypeScript-native",
    description: "Typed decide() input and verdict.",
  },
  {
    title: "Framework-agnostic",
    description: "LangGraph, CrewAI, AgentCore, SAP Joule — all POST the same contract.",
  },
  {
    title: "allow · deny · escalate",
    description: "One vocabulary, mapped to AuthZEN.",
  },
  {
    title: "Sealed reason returned",
    description: "The rule ids that fired come back with the verdict.",
  },
];

const snippet = `import { WardenClient } from "@warden/sdk";
const warden = new WardenClient({ baseUrl });

const v = await warden.decide({
  requestId, actor: "desk.agent",
  actionType: "approve_settlement",
  resource: "DEAL-88421", amount: 2_000_000,
  orgPath: "/global/trading/gas/",
});
if (v.verdict !== "allow") halt(v.reason); // deny | escalate`;

export function DevelopersSection() {
  const [isVisible, setIsVisible] = useState(false);
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

  return (
    <section id="developers" ref={sectionRef} className="relative py-24 lg:py-32 overflow-hidden">
      {/* Code panel — absolute, bottom-right, behind the text (replaces the photo) */}
      <div
        className={`absolute bottom-12 right-0 w-[55%] hidden lg:block pointer-events-none transition-all duration-1000 delay-300 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <div className="ml-auto max-w-[640px] border border-foreground/10 bg-foreground text-background shadow-[0_24px_60px_-32px_rgba(20,23,26,0.45)]">
          <div className="flex items-center justify-between border-b border-background/10 px-5 py-3">
            <div className="flex gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-background/25" />
              <span className="h-2.5 w-2.5 rounded-full bg-background/25" />
              <span className="h-2.5 w-2.5 rounded-full bg-background/25" />
            </div>
            <span className="font-mono text-[11px] text-background/40">govern.ts</span>
          </div>
          <pre className="overflow-x-auto p-6 font-mono text-[13px] leading-relaxed text-background/80">
            {snippet}
          </pre>
        </div>
        {/* Fade the left edge so it reads as a backdrop to the copy */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/55 to-transparent" />
      </div>

      {/* All text content sits on top */}
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Header — full width */}
        <div
          className={`mb-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="inline-flex items-center gap-2.5 mb-6 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-3.5 w-px bg-[var(--color-seal)]" />
            The contract
          </span>
          <h2 className="warden-display warden-display-xl">
            Code your agents.
            <br />
            <span className="font-normal text-muted-foreground">Govern them in one call.</span>
          </h2>
        </div>

        {/* Description + features — left half only */}
        <div
          className={`max-w-full lg:max-w-[50%] transition-all duration-700 delay-100 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-xl text-muted-foreground mb-12 leading-relaxed max-w-md">
            One call before every agent action. The{" "}
            <span className="font-mono text-foreground">@warden/sdk</span> drop-in returns a typed
            verdict with the reason you can defend.
          </p>
          <div className="grid grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={`transition-all duration-500 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
                style={{ transitionDelay: `${index * 50 + 200}ms` }}
              >
                <h3 className="font-medium mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Code panel — inline for mobile/tablet where the absolute one is hidden */}
          <div className="mt-12 lg:hidden border border-foreground/10 bg-foreground text-background">
            <div className="flex items-center justify-between border-b border-background/10 px-5 py-3">
              <div className="flex gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-background/25" />
                <span className="h-2.5 w-2.5 rounded-full bg-background/25" />
                <span className="h-2.5 w-2.5 rounded-full bg-background/25" />
              </div>
              <span className="font-mono text-[11px] text-background/40">govern.ts</span>
            </div>
            <pre className="overflow-x-auto p-6 font-mono text-[12px] leading-relaxed text-background/80">
              {snippet}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
