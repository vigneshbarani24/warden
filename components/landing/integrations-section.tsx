"use client";

import { useEffect, useState, useRef } from "react";

type Integration = { name: string; category: string };

const integrations: Integration[] = [
  { name: "LangGraph", category: "framework" },
  { name: "CrewAI", category: "framework" },
  { name: "AWS AgentCore", category: "gateway" },
  { name: "SAP Joule", category: "ERP" },
  { name: "Microsoft Agent Framework", category: "framework" },
  { name: "MCP gateways", category: "protocol" },
  { name: "OpenAI", category: "LLM" },
  { name: "Anthropic", category: "LLM" },
  { name: "Oracle", category: "ERP" },
  { name: "Workday", category: "ERP" },
  { name: "Cedar · OPA", category: "policy" },
  { name: "Bedrock Guardrails", category: "safety" },
];

const stats: Integration[] = [
  { name: "1", category: "HTTP contract" },
  { name: "allow·deny·escalate", category: "one vocabulary" },
  { name: "any", category: "framework" },
];

export function IntegrationsSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 },
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="integrations" ref={sectionRef} className="relative overflow-hidden">
      {/* Header — centered */}
      <div className="relative z-10 pt-24 lg:pt-32 text-center">
        <span
          className={`inline-flex items-center gap-4 text-sm font-mono text-muted-foreground mb-8 transition-all duration-700 justify-center ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <span className="w-12 h-px bg-foreground/20" />
          Integrations
          <span className="w-12 h-px bg-foreground/20" />
        </span>

        <h2
          className={`text-4xl md:text-5xl lg:text-7xl font-display tracking-tight leading-[0.9] transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          Any agent,
          <br />
          <span className="text-muted-foreground">any framework.</span>
        </h2>

        <p
          className={`mt-8 text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto transition-all duration-1000 delay-100 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          Warden is a plain HTTP contract. Any agent calls{" "}
          <span className="font-mono text-foreground">decide()</span> before it acts — no SDK
          lock-in, no framework coupling.
        </p>
      </div>

      {/* Integration grid */}
      <div className="relative z-10 mt-16 lg:mt-24 max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-16">
          {integrations.map((integration, index) => (
            <div
              key={integration.name}
              className={`group relative overflow-hidden p-6 lg:p-8 border transition-all duration-500 cursor-default min-h-[120px] flex flex-col justify-between ${
                hoveredIndex === index
                  ? "border-foreground bg-foreground/[0.04] scale-[1.02]"
                  : "border-foreground/10 hover:border-foreground/30"
              } ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              style={{
                transitionDelay: `${index * 30 + 300}ms`,
              }}
              onMouseEnter={(e) => {
                setHoveredIndex(index);
                const rect = e.currentTarget.getBoundingClientRect();
                setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
              }}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
              }}
              onMouseLeave={() => {
                setHoveredIndex(null);
                setMousePos(null);
              }}
            >
              {/* Cursor-following halo — retinted to oxblood seal */}
              {hoveredIndex === index && mousePos && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-0"
                  style={{
                    background: `radial-gradient(200px circle at ${mousePos.x}px ${mousePos.y}px, rgba(110,29,36,0.12) 0%, transparent 70%)`,
                  }}
                />
              )}

              {/* Category tag */}
              <span
                className={`relative z-10 self-start text-[10px] font-mono px-2 py-0.5 transition-colors ${
                  hoveredIndex === index
                    ? "bg-foreground text-background"
                    : "bg-foreground/10 text-muted-foreground"
                }`}
              >
                {integration.category}
              </span>

              {/* Name */}
              <span className="relative z-10 font-mono text-base lg:text-lg font-medium block mt-6 group-hover:translate-x-1 transition-transform">
                {integration.name}
              </span>

              {/* Animated underline */}
              <div className="absolute bottom-0 left-0 right-0 h-px bg-foreground/20 overflow-hidden">
                <div
                  className={`h-full bg-primary transition-all duration-500 ${
                    hoveredIndex === index ? "w-full" : "w-0"
                  }`}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom stats row */}
        <div
          className={`flex flex-wrap items-center justify-between gap-8 pt-12 border-t border-foreground/10 transition-all duration-1000 delay-500 pb-24 lg:pb-32 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="flex flex-wrap gap-12">
            {stats.map((stat) => (
              <div key={stat.category} className="flex items-baseline gap-3">
                <span className="font-mono text-2xl lg:text-3xl font-display text-foreground">
                  {stat.name}
                </span>
                <span className="text-sm text-muted-foreground">{stat.category}</span>
              </div>
            ))}
          </div>

          <a
            href="#developers"
            className="group inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            View the PDP contract
            <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
          </a>
        </div>
      </div>
    </section>
  );
}
