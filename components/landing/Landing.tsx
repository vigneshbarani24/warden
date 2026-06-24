import { Navigation } from "./navigation";
import { HeroSection } from "./hero-section";
import { ArchitectureSection } from "./architecture-section";
import { FeaturesSection } from "./features-section";
import { HowItWorksSection } from "./how-it-works-section";
import { UseCasesSection } from "./use-cases-section";
import { InfrastructureSection } from "./infrastructure-section";
import { MetricsSection } from "./metrics-section";
import { IntegrationsSection } from "./integrations-section";
import { ComparisonSection } from "./comparison-section";
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
      <ArchitectureSection />
      <FeaturesSection />
      <HowItWorksSection />
      <UseCasesSection />
      <InfrastructureSection />
      <MetricsSection />
      <IntegrationsSection />
      <ComparisonSection />
      <SecuritySection />
      <DevelopersSection />
      <TestimonialsSection />
      <PricingSection />
      <CtaSection />
      <FooterSection />
    </main>
  );
}
