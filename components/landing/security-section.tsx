"use client";

import { useEffect, useState, useRef } from "react";
import { Shield, Lock, Eye, FileCheck } from "lucide-react";

const securityFeatures = [
  {
    icon: Shield,
    title: "Hash-chained",
    description: "Each block hashes the previous. Change one row and every later hash breaks.",
  },
  {
    icon: Lock,
    title: "Append-only",
    description:
      "The app role can INSERT and SELECT only — UPDATE and DELETE are revoked at the database.",
  },
  {
    icon: Eye,
    title: "Verifiable",
    description: "verifyChain recomputes the chain and reports the exact seq of any break.",
  },
  {
    icon: FileCheck,
    title: "Defensible reason",
    description:
      "Every verdict carries the policy-rule ids that fired — the who, what, and why.",
  },
];

const certifications = ["SHA-256", "append-only", "SOX chain of custody", "EU AI Act Art.12"];

// A small sealed spine — seq · hash blocks linked by a hairline. Pure DOM,
// retinted to the oxblood seal. Deterministic so SSR and client agree.
const spine = [
  { seq: "0041", hash: "9f3a2c" },
  { seq: "0040", hash: "3a17be" },
  { seq: "0039", hash: "c0d27e" },
  { seq: "0038", hash: "7be501" },
  { seq: "0037", hash: "1d4af8" },
];

export function SecuritySection() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
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
      setActiveFeature((prev) => (prev + 1) % securityFeatures.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      id="security"
      ref={sectionRef}
      className="relative py-32 lg:py-40 bg-foreground/[0.02] overflow-hidden"
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="mb-20">
          <span
            className={`inline-flex items-center gap-4 text-sm font-mono text-muted-foreground mb-8 transition-all duration-700 ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <span className="w-12 h-px bg-foreground/20" />
            Security
          </span>

          {/* Title — full width */}
          <h2
            className={`text-4xl md:text-5xl lg:text-7xl font-display tracking-tight leading-[0.9] mb-8 transition-all duration-1000 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            Tamper-evident,
            <br />
            <span className="text-muted-foreground">by construction.</span>
          </h2>

          {/* Description — below title */}
          <div
            className={`transition-all duration-1000 delay-100 ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
              Every verdict is hash-chained into an append-only record. Any after-the-fact edit is
              detectable — and the role that writes it cannot update or delete.
            </p>
            <p className="mt-3 font-mono text-sm text-muted-foreground/80 max-w-2xl">
              Tamper-evident, not tamper-proof — it detects edits; an external WORM anchor catches
              even a privileged rewrite.
            </p>
          </div>
        </div>

        {/* Main content */}
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Large card — the big 0 + the sealed-chain spine */}
          <div
            className={`lg:col-span-7 relative p-8 lg:p-12 border border-foreground/10 bg-card/40 min-h-[400px] overflow-hidden transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            {/* The sealed spine, anchored right — structure, not a photo */}
            <div className="absolute inset-y-0 right-8 lg:right-12 hidden sm:flex flex-col items-center justify-center pointer-events-none">
              {spine.map((block, index) => (
                <div key={block.seq} className="flex flex-col items-center">
                  <span
                    className={`inline-flex items-center gap-2 rounded border px-2.5 py-1.5 font-mono text-[11px] transition-all duration-500 ${
                      isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                    } border-primary/30 bg-primary/[0.05]`}
                    style={{ transitionDelay: `${index * 90 + 200}ms` }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span className="text-muted-foreground">{block.seq}</span>
                    <span className="text-primary">{block.hash}</span>
                  </span>
                  {index < spine.length - 1 && (
                    <span className="h-5 w-px bg-primary/30" />
                  )}
                </div>
              ))}
            </div>

            <div className="relative z-10">
              <span className="font-mono text-sm text-muted-foreground">Chain of custody</span>
              <div className="mt-8">
                <span className="text-7xl lg:text-8xl font-display text-foreground">0</span>
                <span className="block text-muted-foreground mt-2">undetected edits</span>
              </div>
            </div>

            {/* Property chips */}
            <div className="absolute bottom-8 left-8 right-8 flex flex-wrap gap-2">
              {certifications.map((cert, index) => (
                <span
                  key={cert}
                  className={`px-3 py-1 border border-foreground/10 text-xs font-mono text-muted-foreground transition-all duration-500 ${
                    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  }`}
                  style={{ transitionDelay: `${index * 100 + 300}ms` }}
                >
                  {cert}
                </span>
              ))}
            </div>
          </div>

          {/* Feature cards stack */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {securityFeatures.map((feature, index) => (
              <div
                key={feature.title}
                className={`p-6 border transition-all duration-500 cursor-default ${
                  activeFeature === index
                    ? "border-foreground/30 bg-foreground/[0.04]"
                    : "border-foreground/10"
                } ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"}`}
                style={{ transitionDelay: `${index * 80}ms` }}
                onClick={() => setActiveFeature(index)}
                onMouseEnter={() => setActiveFeature(index)}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`shrink-0 w-10 h-10 flex items-center justify-center border transition-colors ${
                      activeFeature === index
                        ? "border-foreground bg-foreground text-background"
                        : "border-foreground/20"
                    }`}
                  >
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
