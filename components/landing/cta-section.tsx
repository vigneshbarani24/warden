"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CtaSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.2 },
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <section ref={sectionRef} className="relative overflow-hidden py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div
          className={`relative border border-foreground transition-all duration-1000 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
          onMouseMove={handleMouseMove}
        >
          {/* Spotlight effect */}
          <div
            className="pointer-events-none absolute inset-0 opacity-10 transition-opacity duration-300"
            style={{
              background: `radial-gradient(600px circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(110,29,36,0.18), transparent 40%)`,
            }}
          />

          <div className="relative z-10 px-8 py-16 lg:px-16 lg:py-24">
            <div className="max-w-2xl">
              <h2 className="mb-8 font-display text-4xl leading-[0.95] tracking-tight md:text-5xl lg:text-7xl">
                Govern every action
                <br />
                an agent takes.
              </h2>

              <p className="mb-12 max-w-xl text-xl leading-relaxed text-muted-foreground">
                A policy decision point any agent calls before it acts — resolving authority, limits
                and segregation of duties, sealed to a tamper-evident ledger on Amazon Aurora DSQL.
              </p>

              <div className="flex flex-col items-start gap-4 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="group h-14 rounded-full bg-foreground px-8 text-base text-background hover:bg-foreground/90"
                >
                  <a href="/console">
                    Open the console
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-14 rounded-full border-foreground/20 px-8 text-base hover:bg-foreground/5"
                >
                  <a href="#developers">The PDP contract</a>
                </Button>
              </div>

              <p className="mt-8 font-mono text-sm text-muted-foreground">
                Tamper-evident audit, by construction.
              </p>
            </div>
          </div>

          {/* Decorative corner */}
          <div className="absolute right-0 top-0 h-32 w-32 border-b border-l border-foreground/10" />
          <div className="absolute bottom-0 left-0 h-32 w-32 border-r border-t border-foreground/10" />
        </div>
      </div>
    </section>
  );
}
