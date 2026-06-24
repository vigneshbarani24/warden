"use client";

import { ArrowUpRight } from "lucide-react";

const footerLinks = {
  Product: [
    { name: "Console", href: "/console" },
    { name: "How it works", href: "#how-it-works" },
    { name: "Use cases", href: "#use-cases" },
    { name: "Pricing", href: "#pricing" },
  ],
  Developers: [
    { name: "The PDP contract", href: "#developers" },
    { name: "Architecture", href: "#stack" },
    { name: "Security", href: "#security" },
  ],
  "Built on": [
    { name: "Amazon Aurora DSQL", href: "#infra" },
    { name: "Vercel", href: "#" },
    { name: "Why DSQL", href: "#infra" },
  ],
  Legal: [
    { name: "Privacy", href: "#" },
    { name: "Terms", href: "#" },
  ],
};

const socialLinks = [{ name: "GitHub", href: "#" }];

export function FooterSection() {
  return (
    <footer className="relative bg-foreground text-background">
      <div className="relative z-10 mx-auto max-w-[1400px] px-6 lg:px-12">
        {/* Main footer */}
        <div className="py-16 lg:py-20">
          <div className="grid grid-cols-2 gap-12 md:grid-cols-6 lg:gap-8">
            {/* Brand column */}
            <div className="col-span-2">
              <a href="/console" className="mb-6 inline-flex items-center gap-2">
                <span className="font-display text-2xl text-background">WARDEN</span>
                <span className="font-mono text-xs text-background/40">PDP</span>
              </a>

              <p className="mb-8 max-w-xs text-sm leading-relaxed text-background/50">
                Governance layer for enterprise AI agents. A policy decision point agents call before
                they act, sealed to a tamper-evident ledger on Amazon Aurora DSQL.
              </p>

              {/* Social links */}
              <div className="flex gap-6">
                {socialLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    className="group flex items-center gap-1 text-sm text-background/40 transition-colors hover:text-background"
                  >
                    {link.name}
                    <ArrowUpRight className="h-3 w-3 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                  </a>
                ))}
              </div>
            </div>

            {/* Link columns */}
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <h3 className="mb-6 text-sm font-medium text-background">{title}</h3>
                <ul className="space-y-4">
                  {links.map((link) => (
                    <li key={link.name}>
                      <a
                        href={link.href}
                        className="inline-flex items-center gap-2 text-sm text-background/40 transition-colors hover:text-background"
                      >
                        {link.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-background/10 py-8 md:flex-row">
          <p className="text-sm text-background/30">
            &copy; 2026 Warden &middot; Built on Amazon Aurora DSQL + Vercel
          </p>

          <div className="flex items-center gap-4 text-sm text-background/30">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Chain intact
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
