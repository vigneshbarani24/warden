"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowRight, Check, Zap } from "lucide-react";

type Plan = {
  name: string;
  description: string;
  price: { monthly: number | null; annual: number | null };
  features: string[];
  cta: string;
  highlight: boolean;
};

const plans: Plan[] = [
  {
    name: "Pilot",
    description: "For a single agent, proving value",
    price: { monthly: 0, annual: 0 },
    features: [
      "1 agent fleet",
      "10,000 decisions / mo",
      "Hash-chained ledger",
      "Single region",
      "Community support",
    ],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Team",
    description: "For an agentic finance function",
    price: { monthly: 2000, annual: 1700 },
    features: [
      "25 agents",
      "1,000,000 decisions / mo",
      "Active-active multi-region",
      "SoD + escalation policies",
      "Decision trace + provenance",
      "SSO",
      "Priority support",
    ],
    cta: "Start pilot",
    highlight: true,
  },
  {
    name: "Enterprise",
    description: "The control plane of record",
    price: { monthly: null, annual: null },
    features: [
      "Unlimited agents",
      "Unlimited decisions",
      "Dedicated regions + witness",
      "External WORM anchor",
      "SOX / EU AI Act retention",
      "On-prem option",
      "Dedicated support + SLA",
    ],
    cta: "Contact sales",
    highlight: false,
  },
];

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
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
    <section id="pricing" ref={sectionRef} className="relative py-32 lg:py-40">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        {/* Header — dramatic offset */}
        <div className="mb-20 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <span className="mb-3 inline-flex items-center gap-3 font-mono text-sm text-muted-foreground">
              <span className="h-px w-12 bg-foreground/30" />
              Pricing
            </span>
            <p className="mb-8 font-mono text-xs text-muted-foreground/80">
              Proposed model — illustrative; no shipped product runs this exact hybrid today.
            </p>
            <h2
              className={`font-display text-4xl leading-[0.9] tracking-tight transition-all duration-1000 md:text-5xl lg:text-7xl ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
              }`}
            >
              Pay per
              <br />
              <span className="text-stroke">decision governed.</span>
            </h2>
          </div>

          {/* Structural seal motif (replaces the v0 decorative image) */}
          <div className="relative h-64 lg:col-span-5 lg:h-auto">
            <div
              className={`absolute inset-0 flex items-center justify-center transition-all duration-1000 delay-100 ${
                isVisible ? "opacity-100" : "opacity-0"
              }`}
              aria-hidden="true"
            >
              <div className="relative flex h-44 w-44 items-center justify-center">
                {/* Concentric seal rings */}
                <span className="absolute inset-0 rounded-full border border-foreground/10" />
                <span className="absolute inset-4 rounded-full border border-foreground/10" />
                <span className="absolute inset-8 rounded-full border border-primary/30" />
                <span className="absolute inset-[3.25rem] rounded-full border border-primary/50" />
                <span className="font-display text-2xl text-primary">$</span>
              </div>
            </div>
          </div>
        </div>

        {/* Billing toggle */}
        <div className="mb-16 flex items-center gap-4">
          <span
            className={`text-sm transition-colors ${
              !isAnnual ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            Monthly
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            aria-label="Toggle annual billing"
            className="relative h-7 w-14 rounded-full bg-foreground/10 p-1 transition-colors hover:bg-foreground/20"
          >
            <div
              className={`h-5 w-5 rounded-full bg-foreground transition-transform duration-300 ${
                isAnnual ? "translate-x-7" : "translate-x-0"
              }`}
            />
          </button>
          <span
            className={`text-sm transition-colors ${
              isAnnual ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            Annual
          </span>
          {isAnnual && (
            <span className="ml-2 bg-foreground px-2 py-1 font-mono text-xs text-background">
              Save 15%
            </span>
          )}
        </div>

        {/* Pricing cards — horizontal layout with overlap */}
        <div className="relative">
          <div className="grid gap-4 lg:grid-cols-3 lg:gap-0">
            {plans.map((plan, index) => (
              <div
                key={plan.name}
                className={`relative border bg-background transition-all duration-700 ${
                  plan.highlight
                    ? "border-foreground lg:z-10 lg:-mx-2 lg:scale-105"
                    : "border-foreground/10 lg:first:-mr-2 lg:last:-ml-2"
                } ${isVisible ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"}`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                {/* Popular badge */}
                {plan.highlight && (
                  <div className="absolute -top-4 left-8 right-8 flex justify-center">
                    <span className="inline-flex items-center gap-2 bg-foreground px-4 py-2 font-mono text-xs uppercase tracking-widest text-background">
                      <Zap className="h-3 w-3" />
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="p-8 lg:p-10">
                  {/* Plan header */}
                  <div className="mb-8 border-b border-foreground/10 pb-8">
                    <span className="font-mono text-xs text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className="mt-2 font-display text-2xl lg:text-3xl">{plan.name}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                  </div>

                  {/* Price */}
                  <div className="mb-8">
                    {plan.price.monthly !== null ? (
                      <div className="flex items-baseline gap-2">
                        <span className="font-display text-5xl lg:text-6xl">
                          ${isAnnual ? plan.price.annual : plan.price.monthly}
                        </span>
                        <span className="text-sm text-muted-foreground">/month</span>
                      </div>
                    ) : (
                      <span className="font-display text-4xl">Custom</span>
                    )}
                    {plan.price.monthly !== null && plan.price.monthly > 0 && (
                      <p className="mt-2 font-mono text-xs text-muted-foreground">
                        {isAnnual ? "billed annually" : "billed monthly"}
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="mb-10 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <button
                    className={`group flex w-full items-center justify-center gap-2 py-4 text-sm font-medium transition-all ${
                      plan.highlight
                        ? "bg-foreground text-background hover:bg-foreground/90"
                        : "border border-foreground/20 text-foreground hover:border-foreground hover:bg-foreground/5"
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom note with seal checks */}
        <div
          className={`mt-20 flex flex-col gap-8 border-t border-foreground/10 pt-12 transition-all duration-1000 delay-500 lg:flex-row lg:items-center lg:justify-between ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              Per-decision pricing
            </span>
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              Tamper-evident ledger
            </span>
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              Any framework
            </span>
          </div>
          <a
            href="/console"
            className="text-sm underline underline-offset-4 transition-colors hover:text-foreground"
          >
            Open the console
          </a>
        </div>
      </div>

      <style jsx>{`
        .text-stroke {
          -webkit-text-stroke: 1.5px currentColor;
          -webkit-text-fill-color: transparent;
        }
      `}</style>
    </section>
  );
}
