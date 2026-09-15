"use client";

import type { ComponentType, SVGProps } from "react";
import { UserPlus, IdCard, Wallet, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/use-t";
import { GoldTitle } from "@/components/shared/gold-title";

const STEP_ICONS: ComponentType<SVGProps<SVGSVGElement>>[] = [UserPlus, IdCard, Wallet, ArrowLeftRight];

/** Hand-drawn-style curl connecting one step to the next — decorative only,
 * so it's skipped below the breakpoint where the steps stack into one column. */
function DoodleArrow({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 90 60"
      fill="none"
      className={cn("pointer-events-none absolute hidden text-gold/50 lg:block", className)}
    >
      <path
        d="M4 6c14 2 24 10 22 20-2 9-14 11-18 4-3-6 2-13 10-13 16 0 30 12 32 26"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="1 7"
      />
      <path
        d="M40 37l10 6-2 11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HowItWorksSection() {
  const t = useT();

  return (
    <section id="how-it-works" className="scroll-mt-24 bg-background py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            <GoldTitle text={t.howItWorks.heading} />
          </h2>
          <p className="mt-3 text-muted-foreground">{t.howItWorks.subheading}</p>
        </div>

        <div className="relative mt-20 grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
          {t.howItWorks.steps.map((s, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <div
                key={s.step}
                className={cn(
                  "relative rounded-3xl border border-black/10 bg-background pt-10 pb-6 text-center shadow-sm dark:border-white/10",
                  i % 2 === 1 && "lg:mt-10"
                )}
              >
                {/* Icon badge — an organic "blob" shape (irregular radii) instead of a
                    plain circle, echoing the sticker-like badges in the reference. */}
                <span
                  aria-hidden="true"
                  className="absolute -top-8 left-1/2 flex size-16 -translate-x-1/2 items-center justify-center bg-gold/15 text-gold [border-radius:62%_38%_53%_47%/41%_55%_45%_59%]"
                >
                  <Icon className="size-6" strokeWidth={1.75} />
                </span>

                <div className="px-5">
                  <span className="inline-flex items-center justify-center rounded-full bg-gold px-4 py-1.5 text-xs font-semibold text-ink shadow-sm">
                    {s.step}. {s.title}
                  </span>
                  <p className="mt-3 text-sm text-muted-foreground">{s.description}</p>
                </div>

                {i < t.howItWorks.steps.length - 1 && (
                  <DoodleArrow
                    className={cn(
                      "top-1 -right-9 size-16",
                      i % 2 === 1 && "top-11 -right-9 -scale-y-100"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
