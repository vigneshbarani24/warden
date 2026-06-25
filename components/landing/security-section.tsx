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

// The head of the sealed chain — the spine itself lives in the hero. Here we
// reference it in words and one display-scale hash, not a duplicate spine.
const HEAD_HASH = "9f3a2c4d8e10b7a3";

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
      className="relative py-20 lg:py-56 bg-foreground/[0.02] overflow-hidden"
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="mb-20">
          <span
            className={`inline-flex items-center gap-2.5 mb-8 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-all duration-700 ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <span className="h-3.5 w-px bg-[var(--color-seal)]" />
            Tamper-evidence
          </span>

          {/* Title — full width */}
          <h2
            className={`warden-display warden-display-xl mb-8 transition-all duration-1000 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            Tamper-evident,
            <br />
            <span className="font-normal text-muted-foreground">by construction.</span>
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
          {/* Large card — the chain in words + one display-scale hash.
              The sealed spine itself is the hero centerpiece; we don't duplicate it. */}
          <div
            className={`lg:col-span-7 relative flex flex-col p-8 lg:p-12 border border-foreground/10 bg-card/40 min-h-[400px] overflow-hidden transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="relative z-10 max-w-xl">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Chain of custody
              </span>
              <p className="mt-6 text-2xl lg:text-3xl leading-snug text-foreground">
                Every verdict links to the one before it. Edit any block and its hash no longer
                matches — the break, and everything below it, shows red on the sealed spine.
              </p>

              {/* The head of the chain — one display-scale hash, mono, the data IS the type */}
              <div className="mt-10">
                <span className="block font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  seq 0041 · head
                </span>
                <span className="mt-2 block font-mono-display text-2xl lg:text-4xl font-medium text-primary [overflow-wrap:anywhere]">
                  {HEAD_HASH}
                </span>
              </div>
            </div>

            {/* Property chips */}
            <div className="mt-auto flex flex-wrap gap-2 pt-12">
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
