"use client";

import { useT } from "@/lib/i18n/use-t";

export function TaglineBanner() {
  const t = useT();

  return (
    <section className="relative overflow-hidden bg-[#a9a9a9] py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_55%)]" />
      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
        <p className="text-3xl font-extrabold tracking-tight text-ink sm:text-5xl">
          {t.tagline.words.map((word, i) => (
            <span key={word}>
              {i > 0 && <span className="mx-2 text-ink/40">|</span>}
              {word}
            </span>
          ))}
        </p>
        <p className="mx-auto mt-4 max-w-lg text-sm font-medium text-ink/80 sm:text-base">{t.tagline.body}</p>
      </div>
    </section>
  );
}
