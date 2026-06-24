"use client";

import { useEffect, useState, useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

// Public historical cases and externalized-authority principles — NOT customers.
const testimonials = [
  {
    quote:
      "One trader ran both the desk and the back office that settled his trades. The bank collapsed.",
    author: "Barings Bank · 1995",
    role: "front/back-office SoD",
    chip: "Barings",
    metric: { value: "£827M", label: "loss — SOD-FBO-01 prevents this" },
  },
  {
    quote: "Positions far beyond his mandate went unchecked at the moment of trade.",
    author: "Société Générale · 2008",
    role: "limit enforced at the action",
    chip: "SocGen",
    metric: { value: "€4.9bn", label: "loss — limits + escalation prevent this" },
  },
  {
    quote:
      "Authority belongs in an externalized decision point: central control, instant revocation, independent audit.",
    author: "XACML · OpenID AuthZEN",
    role: "the PEP/PDP principle",
    chip: "AuthZEN",
    metric: { value: "1", label: "control plane" },
  },
  {
    quote:
      "The knowledge graph is the agent’s memory. MCP is its hands. Warden is its authority.",
    author: "The agentic stack",
    role: "where Warden sits",
    chip: "The stack",
    metric: { value: "3", label: "layers" },
  },
];

export function TestimonialsSection() {
  const [activeIndex, setActiveIndex] = useState(0);
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

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const goTo = (index: number) => setActiveIndex(index);
  const goPrev = () =>
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  const goNext = () => setActiveIndex((prev) => (prev + 1) % testimonials.length);

  const activeTestimonial = testimonials[activeIndex] ?? testimonials[0]!;

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-background py-32 text-foreground lg:py-40"
    >
      {/* ASCII background pattern — barely-there ink */}
      <div className="pointer-events-none absolute inset-0 select-none overflow-hidden whitespace-pre font-mono text-[10px] leading-tight text-foreground/[0.03]">
        {/* Deterministic so SSR and client agree (no Math.random in render). */}
        {Array.from({ length: 60 }, (_, r) =>
          Array.from({ length: 100 }, (_, c) => ((r * 31 + c * 17) % 10 > 6 ? '"' : " ")).join(""),
        ).join("\n")}
      </div>

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 lg:px-12">
        {/* Header */}
        <div className="mb-20 flex items-center justify-between">
          <div>
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-sm text-muted-foreground">
              <span className="h-px w-12 bg-foreground/20" />
              What this prevents
            </span>
            <h2
              className={`font-display text-4xl tracking-tight transition-all duration-1000 lg:text-5xl ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              What this
              <span className="text-muted-foreground"> prevents.</span>
            </h2>
          </div>

          {/* Navigation arrows */}
          <div className="hidden items-center gap-2 lg:flex">
            <button
              onClick={goPrev}
              aria-label="Previous case"
              className="border border-foreground/20 p-4 transition-colors hover:bg-foreground/5"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button
              onClick={goNext}
              aria-label="Next case"
              className="border border-foreground/20 p-4 transition-colors hover:bg-foreground/5"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Main content — split layout */}
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-20">
          {/* Quote side */}
          <div className="relative lg:col-span-7">
            {/* Large quote mark */}
            <span className="absolute -left-4 -top-8 select-none font-display text-[200px] leading-none text-foreground/5">
              &ldquo;
            </span>

            <div className="relative">
              <blockquote
                key={activeIndex}
                className="animate-fadeSlideIn font-display text-3xl leading-[1.2] tracking-tight lg:text-4xl xl:text-5xl"
              >
                {activeTestimonial.quote}
              </blockquote>

              {/* Author */}
              <div className="mt-12 flex items-center gap-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground/[0.06]">
                  <span className="font-display text-xl text-primary">
                    {activeTestimonial.author.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-lg font-medium">{activeTestimonial.author}</p>
                  <p className="text-muted-foreground">{activeTestimonial.role}</p>
                </div>
              </div>

              <p className="mt-8 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Public cases and principles — not customers.
              </p>
            </div>
          </div>

          {/* Metric cards side */}
          <div className="flex flex-col justify-center gap-6 lg:col-span-5">
            {/* Active metric — large */}
            <div
              key={`metric-${activeIndex}`}
              className="animate-fadeSlideIn border border-foreground/10 bg-card/40 p-10"
            >
              <span className="mb-4 block font-display text-7xl text-primary lg:text-8xl">
                {activeTestimonial.metric.value}
              </span>
              <span className="text-lg text-muted-foreground">
                {activeTestimonial.metric.label}
              </span>
            </div>

            {/* Progress indicators */}
            <div className="flex gap-2">
              {testimonials.map((t, idx) => (
                <button
                  key={t.chip}
                  onClick={() => goTo(idx)}
                  aria-label={`Go to ${t.chip}`}
                  className="h-1 flex-1 overflow-hidden bg-foreground/10"
                >
                  <div
                    className={`h-full bg-primary transition-all duration-300 ${
                      idx === activeIndex
                        ? "w-full"
                        : idx < activeIndex
                          ? "w-full opacity-50"
                          : "w-0"
                    }`}
                    style={idx === activeIndex ? { animation: "progress 8s linear forwards" } : {}}
                  />
                </button>
              ))}
            </div>

            {/* Source list */}
            <div className="mt-4 border-t border-foreground/10 pt-6">
              <span className="mb-4 block font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Sources
              </span>
              <div className="flex flex-wrap gap-3">
                {testimonials.map((t, idx) => (
                  <button
                    key={t.chip}
                    onClick={() => goTo(idx)}
                    className={`border px-4 py-2 text-sm transition-all ${
                      idx === activeIndex
                        ? "border-foreground/40 text-foreground"
                        : "border-foreground/10 text-muted-foreground hover:border-foreground/30"
                    }`}
                  >
                    {t.chip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-fadeSlideIn {
          animation: fadeSlideIn 0.5s ease-out forwards;
        }
        @keyframes progress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
      `}</style>
    </section>
  );
}
