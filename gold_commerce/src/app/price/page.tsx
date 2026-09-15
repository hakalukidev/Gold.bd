"use client";

import { LandingHeader } from "@/components/landing/landing-header";
import { GoldPriceTicker } from "@/components/landing/gold-price-ticker";
import { StatusStrip } from "@/components/landing/status-strip";
import { RateHistorySection } from "@/components/landing/rate-history-section";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function PricePage() {
  return (
    <main className="flex flex-1 flex-col">
      <GoldPriceTicker />
      <LandingHeader />
      <StatusStrip />

      <RateHistorySection />

      <LandingFooter />
    </main>
  );
}
