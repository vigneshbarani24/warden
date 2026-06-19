import { Navigation } from "./navigation";
import { HeroSection } from "./hero-section";
import { FeaturesSection } from "./features-section";
import { HowItWorksSection } from "./how-it-works-section";
import { InfrastructureSection } from "./infrastructure-section";
import { MetricsSection } from "./metrics-section";
import { IntegrationsSection } from "./integrations-section";
import { SecuritySection } from "./security-section";
import { DevelopersSection } from "./developers-section";
import { TestimonialsSection } from "./testimonials-section";
import { PricingSection } from "./pricing-section";
import { CtaSection } from "./cta-section";
import { FooterSection } from "./footer-section";

export function Landing() {
  return (
    <main className="landingRoot relative min-h-screen overflow-x-hidden bg-background text-foreground font-sans antialiased noise-overlay">
      <Navigation />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <InfrastructureSection />
      <MetricsSection />
      <IntegrationsSection />
      <SecuritySection />
      <DevelopersSection />
      <TestimonialsSection />
      <PricingSection />
      <CtaSection />
      <FooterSection />
    </main>
  );
}
