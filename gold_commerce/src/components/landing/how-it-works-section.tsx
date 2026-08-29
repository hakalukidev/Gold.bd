"use client";

import { useT } from "@/lib/i18n/use-t";

export function HowItWorksSection() {
  const t = useT();

  return (
    <section id="how-it-works" className="scroll-mt-24 bg-background py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.howItWorks.heading}</h2>
          <p className="mt-3 text-muted-foreground">{t.howItWorks.subheading}</p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <ol className="grid gap-4 sm:grid-cols-2">
            {t.howItWorks.steps.map((s) => (
              <li key={s.step} className="flex gap-4 rounded-md border p-5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gold/15 font-semibold text-gold">
                  {s.step}
                </span>
                <div>
                  <p className="font-medium">{s.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                </div>
              </li>
            ))}
          </ol>

          {/* ---------- Phone mockup ---------- */}
          <div className="relative mx-auto hidden w-56 lg:block">
            <div className="absolute -inset-6 rounded-md bg-gold/10 blur-2xl" />
            <div className="relative overflow-hidden rounded-md border-4 border-ink-light bg-ink shadow-2xl">
              <div className="flex h-104 flex-col gap-3 p-4 pt-8">
                <p className="text-center text-xs font-semibold tracking-wide text-gold">{t.howItWorks.phoneBrand}</p>
                <div className="rounded-md border border-white/10 bg-white/5 p-3">
                  <p className="text-[10px] text-neutral-400">{t.howItWorks.phoneGoldBalance}</p>
                  <p className="text-lg font-semibold text-white">2.500 g</p>
                </div>
                <div className="rounded-md border border-white/10 bg-white/5 p-3">
                  <p className="text-[10px] text-neutral-400">{t.howItWorks.phoneCashBalance}</p>
                  <p className="text-lg font-semibold text-white">৳ 19,250</p>
                </div>
                <div className="mt-auto grid grid-cols-2 gap-2">
                  <div className="rounded-md bg-gold py-2 text-center text-xs font-semibold text-ink">
                    {t.howItWorks.phoneBuy}
                  </div>
                  <div className="rounded-md border border-white/20 py-2 text-center text-xs font-semibold text-white">
                    {t.howItWorks.phoneSell}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
