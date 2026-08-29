"use client";

import { useT } from "@/lib/i18n/use-t";
import { WALLET_REGISTER_URL } from "@/lib/site-links";
import { Button } from "@/components/ui/button";
import { LandingHeader } from "@/components/landing/landing-header";
import { GoldPriceTicker } from "@/components/landing/gold-price-ticker";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function BuyingGuidePage() {
  const t = useT();
  const g = t.buyingGuidePage;

  return (
    <main className="flex flex-1 flex-col">
      <GoldPriceTicker />
      <LandingHeader />

      <div className="bg-ink py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">{g.heading}</h1>
          <p className="mt-3 text-neutral-300">{g.subheading}</p>
        </div>

        {/* ---------- Steps ---------- */}
        <div className="mx-auto mt-12 max-w-3xl px-4 sm:px-6">
          <ol className="flex flex-col gap-4">
            {g.steps.map((step, i) => (
              <li
                key={step.title}
                className="flex gap-4 rounded-md border border-white/10 bg-white/5 p-5 sm:p-6"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-sm font-bold text-gold">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-white">{step.title}</p>
                  <p className="mt-1 text-sm text-neutral-400">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* ---------- Tips ---------- */}
        <div className="mx-auto mt-10 max-w-3xl px-4 sm:px-6">
          <div className="rounded-md border border-white/10 bg-white/5 p-5 sm:p-6">
            <p className="font-semibold text-white">{g.tipsHeading}</p>
            <ul className="mt-3 flex flex-col gap-2">
              {g.tips.map((tip) => (
                <li key={tip} className="flex gap-2 text-sm text-neutral-400">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-gold" aria-hidden="true" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ---------- CTA ---------- */}
        <div className="mx-auto mt-12 flex max-w-3xl flex-col items-center gap-4 px-4 text-center sm:px-6">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">{g.ctaHeading}</h2>
          <p className="max-w-md text-sm text-neutral-400">{g.ctaBody}</p>
          <Button variant="gold" nativeButton={false} render={<a href={WALLET_REGISTER_URL}>{t.ctaBand.cta}</a>} />
        </div>
      </div>

      <LandingFooter />
    </main>
  );
}
