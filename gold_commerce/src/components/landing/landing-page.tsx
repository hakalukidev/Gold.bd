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
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { TrustSection } from "@/components/landing/trust-section";
import { AboutSection } from "@/components/landing/about-section";
import { TaglineBanner } from "@/components/landing/tagline-banner";
import { FaqSection } from "@/components/landing/faq-section";
import { LandingFooter } from "@/components/landing/landing-footer";
import { GoldTitle } from "@/components/shared/gold-title";
import Image from "next/image";

export function LandingPage() {
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
      <section>
        <div className="w-full">
          {/* The coin artwork is cropped to its center and clipped to this
              rounded rectangle, with the copy sitting straight on top of it —
              no separate blurred card. */}
          <div className="relative isolate flex min-h-40 flex-col items-center justify-center gap-3 overflow-hidden px-6 py-8 text-center sm:min-h-48 sm:px-10">
            <Image
              src="/gold-coins-cta.png"
              alt=""
              aria-hidden="true"
              fill
              sizes="(min-width: 768px) 900px, 100vw"
              className="pointer-events-none -z-20 select-none object-cover object-center"
            />
            <h2 className="text-xl font-semibold sm:text-2xl">
              <GoldTitle text={t.ctaBand.heading} baseClassName="text-foreground" />
            </h2>
            <p className="max-w-md text-sm text-foreground/80">{t.ctaBand.body}</p>
            <Button
              size="lg"
              variant="gold"
              nativeButton={false}
              className="border-0! shadow-[0_0_30px_rgba(244,198,78,0.45)]"
              render={<a href={WALLET_REGISTER_URL}>{t.ctaBand.cta}</a>}
            />
          </div>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
