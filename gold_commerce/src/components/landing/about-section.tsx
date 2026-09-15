"use client";

import { useT } from "@/lib/i18n/use-t";
import { useAboutStats } from "@/hooks/use-about-stats";
import { formatCompactCount } from "@/lib/format";
import { GoldTitle } from "@/components/shared/gold-title";

export function AboutSection() {
  const t = useT();
  const { data: stats } = useAboutStats();

  // Values come from the admin stats page (defaulting to 0 until set there);
  // only the labels are localized copy. Order matches the dictionary's
  // about.stats array: customers, metal vaulted, insured holdings.
  const values = [
    `${formatCompactCount(stats?.customers ?? 0)}+`,
    `${stats?.metalVaultedKg ?? 0}kg+`,
    `${stats?.insuredPercent ?? 0}%`,
  ];

  return (
    <section id="about" className="scroll-mt-24 bg-background py-20">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="text-2xl font-bold sm:text-3xl">
          <GoldTitle text={t.about.heading} />
        </h2>
        <p className="mx-auto mt-4 text-neutral-600 dark:text-neutral-300">{t.about.body}</p>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {t.about.stats.map((stat, i) => (
            <div key={stat.label} className="rounded-md border border-black/10 bg-black/5 p-6 dark:border-white/10 dark:bg-white/5">
              <p className="text-2xl font-bold text-gold sm:text-3xl">{values[i]}</p>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
