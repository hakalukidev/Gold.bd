"use client";

import { useT } from "@/lib/i18n/use-t";

export function TrustSection() {
  const t = useT();

  return (
    <section className="bg-ink py-16">
      <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">{t.trust.heading}</h2>
        <p className="mx-auto mt-3 max-w-xl text-neutral-400">{t.trust.subheading}</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.trust.badges.map((b) => (
            <div key={b.title} className="rounded-md border border-white/10 bg-white/5 p-5 text-left">
              <p className="font-medium text-gold">{b.title}</p>
              <p className="mt-2 text-sm text-neutral-400">{b.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
