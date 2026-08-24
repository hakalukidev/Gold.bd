"use client";

import { useT } from "@/lib/i18n/use-t";

export function AboutSection() {
  const t = useT();

  return (
    <section id="about" className="scroll-mt-24 bg-ink py-20">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">{t.about.heading}</h2>
        <p className="mx-auto mt-4 text-neutral-300">{t.about.body}</p>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {t.about.stats.map((stat) => (
            <div key={stat.label} className="rounded-md border border-white/10 bg-white/5 p-6">
              <p className="text-2xl font-bold text-gold sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-sm text-neutral-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
