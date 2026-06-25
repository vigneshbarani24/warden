"use client";

import { useEffect, useRef, useState } from "react";

const steps = [
  {
    number: "01",
    title: "Resolve",
    subtitle: "authority",
    description:
      "Find the actor's active grants for this action at or above the resource's org path, up the hierarchy.",
    code: `// active grant up the desk hierarchy?
{ actor: "desk.agent", action: "approve_settlement",
  orgPath: "/global/trading/gas/" }`,
  },
  {
    number: "02",
    title: "Check",
    subtitle: "the limit",
    description:
      "Within mandate it allows; over it, escalate to the nearest authority that covers the amount.",
    code: `amount: 2_000_000  >  limit: 3_000_000  // within mandate`,
  },
  {
    number: "03",
    title: "Check",
    subtitle: "duties (over history)",
    description:
      "Does the actor hold a conflicting prior action on this resource? Front office can't settle its own deal.",
    code: `priorActions(actor, "DEAL-88421")
// captured + settle  →  SOD-FBO-01  →  deny`,
  },
  {
    number: "04",
    title: "Seal",
    subtitle: "the verdict",
    description:
      "Append the verdict + the rules that fired to the hash-chained ledger. Reason returned to the agent.",
    code: `{ verdict: "deny", reason: "SoD: …",
  firedRuleIds: ["SOD-FBO-01"] }  // sealed`,
  },
];

export function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);
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

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative py-24 lg:py-32 bg-background text-foreground overflow-hidden"
    >
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-primary/[0.04] blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Header — eyebrow + the three-line decision pipeline, fading */}
        <div className="relative mb-12 lg:mb-16 grid lg:grid-cols-2 gap-4 lg:gap-12 items-end">
          <div className="overflow-hidden">
            <div
              className={`transition-all duration-1000 ${
                isVisible ? "translate-x-0 opacity-100" : "-translate-x-12 opacity-0"
              }`}
            >
              <span className="inline-flex items-center gap-2.5 mb-8 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <span className="h-3.5 w-px bg-[var(--color-seal)]" />
                The sequence
              </span>
            </div>

            <h2
              className={`warden-display warden-display-xl transition-all duration-1000 delay-100 ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-16 opacity-0"
              }`}
            >
              <span className="block">Resolve.</span>
              <span className="block font-normal text-foreground/40">Check.</span>
              <span className="block font-normal text-foreground/15">Seal.</span>
            </h2>
          </div>

          {/* The decision contract, stated plainly — replaces the decorative tree */}
          <div
            className={`relative transition-all duration-1000 delay-200 ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="border border-foreground/10 bg-card/40 p-7 lg:p-9">
              <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                The PDP contract
              </span>
              <p className="mt-5 text-lg lg:text-xl text-muted-foreground leading-relaxed">
                An agent posts a proposed action. Warden runs four checks in one transaction and
                returns{" "}
                <span className="font-mono text-allow">allow</span> ·{" "}
                <span className="font-mono text-deny">deny</span> ·{" "}
                <span className="font-mono text-escalate">escalate</span> — with the reason and the
                exact rules that fired.
              </p>
            </div>
          </div>
        </div>

        {/* Four auto-advancing step cards, each carrying its real decide() slice */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step, index) => (
            <button
              key={step.number}
              type="button"
              onClick={() => setActiveStep(index)}
              className={`relative text-left p-7 lg:p-8 border transition-all duration-500 ${
                activeStep === index
                  ? "bg-card border-foreground/40"
                  : "bg-card/40 border-foreground/15 hover:border-foreground/35"
              }`}
            >
              {/* Step number with animated progress line */}
              <div className="flex items-center gap-4 mb-7">
                <span
                  className={`font-mono-display text-3xl lg:text-4xl font-bold transition-colors duration-300 ${
                    activeStep === index ? "text-primary" : "text-foreground/20"
                  }`}
                >
                  {step.number}
                </span>
                <div className="flex-1 h-px bg-foreground/10 overflow-hidden">
                  {activeStep === index && (
                    <div className="h-full bg-primary/50 animate-progress" />
                  )}
                </div>
              </div>

              {/* Title */}
              <h3 className="warden-display !text-[clamp(1.4rem,1.1rem+1vw,1.85rem)] mb-1 leading-tight">
                {step.title}
              </h3>
              <span className="block mb-5 text-lg text-muted-foreground">{step.subtitle}</span>

              {/* Description */}
              <p
                className={`text-[15px] text-muted-foreground leading-relaxed transition-opacity duration-300 ${
                  activeStep === index ? "opacity-100" : "opacity-70"
                }`}
              >
                {step.description}
              </p>

              {/* The real decide() slice this step runs (code = phrasing content, valid in a button) */}
              <code className="mt-6 block border-t border-foreground/10 pt-5 font-mono text-[11px] leading-relaxed text-foreground/70 whitespace-pre-wrap [overflow-wrap:anywhere]">
                {step.code}
              </code>

              {/* Active indicator */}
              <div
                className={`absolute bottom-0 left-0 right-0 h-1 bg-primary transition-transform duration-500 origin-left ${
                  activeStep === index ? "scale-x-100" : "scale-x-0"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes progress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
        .animate-progress {
          animation: progress 6s linear forwards;
        }
      `}</style>
    </section>
  );
}
