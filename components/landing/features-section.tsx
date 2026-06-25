"use client";

import { useEffect, useRef, useState } from "react";

// Computed once on the client; canvas loops paint one static frame when set.
const REDUCED_MOTION =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Feature = {
  // No ordinal: the four checks are a distinguished set, not a sequence.
  // Literal 01-0N numbering is reserved for How-It-Works (the one true sequence).
  key: string;
  title: string;
  description: string;
  stats: { value: string; label: string };
};

const features: Feature[] = [
  {
    key: "authority",
    title: "Authority grants",
    description:
      "Who can do what, where, up to how much — resolved up the org hierarchy. No active grant, no action.",
    stats: { value: "deny", label: "no grant" },
  },
  {
    key: "limit",
    title: "Approval limits & escalation",
    description:
      "Within mandate it passes; over it, the action escalates to the nearest authority that covers it.",
    stats: { value: "escalate", label: "over limit" },
  },
  {
    key: "sod",
    title: "Segregation of duties",
    description:
      "An agent can't settle the deal it captured. Conflicting actions on the same resource are denied.",
    stats: { value: "SOD-FBO-01", label: "the Barings wall" },
  },
  {
    key: "ledger",
    title: "Tamper-evident ledger",
    description:
      "Every verdict is hash-chained into an append-only record. Any after-the-fact edit is detectable.",
    stats: { value: "SHA-256", label: "sealed" },
  },
];

// Floating dot particles — retinted from the reference's white to ink/seal,
// with the seal accent rising under the cursor.
function ParticleVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      };
    };
    canvas.addEventListener("mousemove", handleMouseMove);

    // Generate stable particle positions
    const COUNT = 70;
    const particles = Array.from({ length: COUNT }, (_, i) => {
      const seed = i * 1.618;
      return {
        bx: (seed * 127.1) % 1,
        by: (seed * 311.7) % 1,
        phase: seed * Math.PI * 2,
        speed: 0.4 + (seed % 0.4),
        radius: 1.2 + (seed % 2.2),
      };
    });

    let time = 0;
    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      particles.forEach((p) => {
        const flowX = Math.sin(time * p.speed * 0.4 + p.phase) * 38;
        const flowY = Math.cos(time * p.speed * 0.3 + p.phase * 0.7) * 24;

        const bx = p.bx * w;
        const by = p.by * h;
        const dx = p.bx - mx;
        const dy = p.by - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const influence = Math.max(0, 1 - dist * 2.8);

        const x = bx + flowX + influence * Math.cos(time + p.phase) * 36;
        const y = by + flowY + influence * Math.sin(time + p.phase) * 36;

        const pulse = Math.sin(time * p.speed + p.phase) * 0.5 + 0.5;
        const alpha = 0.05 + pulse * 0.14 + influence * 0.24;

        ctx.beginPath();
        ctx.arc(x, y, p.radius + pulse * 0.8, 0, Math.PI * 2);
        // ink base; oxblood seal blooms where the cursor pulls.
        ctx.fillStyle =
          influence > 0.18
            ? `rgba(110, 29, 36, ${alpha + influence * 0.25})`
            : `rgba(20, 23, 26, ${alpha})`;
        ctx.fill();
      });

      time += 0.016;
      if (!REDUCED_MOTION) frameRef.current = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-auto"
      style={{ width: "100%", height: "100%" }}
    />
  );
}

export function FeaturesSection() {
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

  const lead = features[0]!;
  const supporting = features.slice(1);

  return (
    <section id="features" ref={sectionRef} className="relative py-24 lg:py-32 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Header — diagonal: heading left, lead right */}
        <div className="relative mb-24 lg:mb-32">
          <div className="grid lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-7">
              <span className="inline-flex items-center gap-2.5 mb-6 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <span className="h-3.5 w-px bg-[var(--color-seal)]" />
                The engine
              </span>
              <h2
                className={`warden-display warden-display-xl transition-all duration-1000 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
              >
                The decision, before the action.
                <br />
                <span className="font-normal text-muted-foreground">Every time, with a reason.</span>
              </h2>
            </div>
            <div className="lg:col-span-5 lg:pb-4">
              <p
                className={`text-xl text-muted-foreground leading-relaxed transition-all duration-1000 delay-200 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
              >
                The engine, in four checks. Authority, limit, segregation, seal — resolved in one
                transaction before the action commits.
              </p>
            </div>
          </div>
        </div>

        {/* Bento — large lead card (01) over three supporting cards */}
        <div className="grid lg:grid-cols-12 gap-4 lg:gap-6">
          {/* Large feature card with the retinted particle field */}
          <div
            className={`lg:col-span-12 relative bg-foreground/[0.02] border border-foreground/10 min-h-[460px] overflow-hidden group transition-all duration-700 flex ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
            }`}
          >
            {/* Left: text content over the canvas */}
            <div className="relative flex-1 p-8 lg:p-12">
              <ParticleVisualization />
              <div className="relative z-10 pointer-events-none">
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Authority
                </span>
                <h3 className="warden-display !text-[clamp(1.6rem,1.2rem+1.6vw,2.4rem)] mt-4 mb-6 group-hover:translate-x-2 transition-transform duration-500">
                  {lead.title}
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-md mb-8">
                  {lead.description}
                </p>
                <div>
                  <span className="font-mono-display text-4xl lg:text-5xl font-bold lowercase text-deny">
                    {lead.stats.value}
                  </span>
                  <span className="block text-sm text-muted-foreground font-mono mt-2">
                    {lead.stats.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: structural panel — the authority resolution, as quiet data (no photo) */}
            <div className="hidden lg:block relative w-[42%] shrink-0 overflow-hidden border-l border-foreground/10">
              <div
                className="absolute inset-0 opacity-[0.6]"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(20,23,26,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(20,23,26,0.05) 1px, transparent 1px)",
                  backgroundSize: "44px 44px",
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center p-10">
                <div className="w-full max-w-xs font-mono text-[12px] leading-relaxed">
                  <div className="mb-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    resolve authority
                  </div>
                  <div className="space-y-1.5 text-foreground/70">
                    <div className="text-muted-foreground">/global/trading/</div>
                    <div className="flex items-center justify-between pl-3">
                      <span>/crude/</span>
                      <span className="text-allow">grant ✓</span>
                    </div>
                    <div className="flex items-center justify-between pl-3">
                      <span>/gas/</span>
                      <span className="text-destructive">revoked ✕</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-foreground/10 pt-3">
                      <span className="text-muted-foreground">limit</span>
                      <span className="font-mono-display">$3,000,000</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">duties</span>
                      <span className="text-escalate">SOD-FBO-01</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">verdict</span>
                      <span className="font-semibold text-deny">deny ✕</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-background/40" />
            </div>
          </div>

          {/* Three supporting cards */}
          {supporting.map((feature, i) => (
            <SupportingCard key={feature.key} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function SupportingCard({ feature, index }: { feature: Feature; index: number }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisible(true);
      },
      { threshold: 0.2 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`group relative lg:col-span-4 border border-foreground/10 bg-card/40 p-8 min-h-[260px] flex flex-col transition-all duration-700 hover:border-foreground/30 hover:bg-foreground/[0.02] ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
      }`}
      style={{ transitionDelay: `${index * 100 + 150}ms` }}
    >
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {feature.key === "limit" ? "Limit" : feature.key === "sod" ? "Duties" : "Ledger"}
      </span>
      <h3 className="warden-display !text-[clamp(1.4rem,1.1rem+1.1vw,1.95rem)] mt-4 mb-4 group-hover:translate-x-2 transition-transform duration-500">
        {feature.title}
      </h3>
      <p className="text-[15px] text-muted-foreground leading-relaxed mb-8">{feature.description}</p>
      <div className="mt-auto">
        <span
          className={`font-mono-display text-2xl lg:text-3xl font-semibold ${
            feature.key === "limit" ? "text-escalate" : "text-primary"
          }`}
        >
          {feature.stats.value}
        </span>
        <span className="block text-xs text-muted-foreground font-mono mt-2">
          {feature.stats.label}
        </span>
      </div>
    </div>
  );
}
