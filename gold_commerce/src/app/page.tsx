"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/lib/i18n/use-t";
import { WALLET_REGISTER_URL } from "@/lib/site-links";
import { LandingHeader } from "@/components/landing/landing-header";
import { StatusStrip } from "@/components/landing/status-strip";
import { GoldPriceTicker } from "@/components/landing/gold-price-ticker";
import { HeroSection } from "@/components/landing/hero-section";
import { TodayPriceSection } from "@/components/landing/today-price-section";
import { WhySection } from "@/components/landing/why-section";
import { ProductsSection } from "@/components/landing/products-section";
import { RateHistorySection } from "@/components/landing/rate-history-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { TrustSection } from "@/components/landing/trust-section";
import { AboutSection } from "@/components/landing/about-section";
import { TaglineBanner } from "@/components/landing/tagline-banner";
import { FaqSection } from "@/components/landing/faq-section";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function LandingPage() {
  const t = useT();

  return (
    <main className="flex flex-1 flex-col">
      <div className="sticky top-0 z-50">
        <GoldPriceTicker />
        <LandingHeader />
      </div>
      <StatusStrip />

      <HeroSection />
      <TodayPriceSection />

      <WhySection />
      <ProductsSection />
      <RateHistorySection />

      {/* ---------- Features ---------- */}
      <section id="features" className="scroll-mt-24 bg-background py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.features.heading}</h2>
            <p className="mt-3 text-muted-foreground">{t.features.subheading}</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {t.features.items.map((feature) => (
              <Card key={feature.title}>
                <CardContent className="space-y-2 pt-2">
                  <div className="flex size-9 items-center justify-center rounded-md bg-gold/15 text-gold">
                    <span className="text-lg">●</span>
                  </div>
                  <p className="font-medium">{feature.title}</p>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <HowItWorksSection />
      <TrustSection />
      <AboutSection />
      <TaglineBanner />
      <FaqSection />

      {/* ---------- CTA footer band ---------- */}
      <section className="border-t bg-muted/30 py-14">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center sm:px-6">
          <h2 className="text-xl font-semibold sm:text-2xl">{t.ctaBand.heading}</h2>
          <p className="max-w-md text-sm text-muted-foreground">{t.ctaBand.body}</p>
          <Button
            size="lg"
            variant="gold"
            nativeButton={false}
            render={<a href={WALLET_REGISTER_URL}>{t.ctaBand.cta}</a>}
          />
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
