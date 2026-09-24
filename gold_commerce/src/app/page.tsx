import type { Metadata } from "next";

// The storefront landing page is parked while the site is being finished —
// its markup is untouched in @/components/landing/landing-page. To put it
// back, import { LandingPage } from "@/components/landing/landing-page" and
// return <LandingPage /> instead of the holding screen below.

export const metadata: Metadata = {
  title: "GOLD.BD — শীঘ্রই আসছে",
  description: "বাংলাদেশের ডিজিটাল গোল্ড প্ল্যাটফর্ম — খুব শিগগিরই।",
};

export default function ComingSoonPage() {
  return (
    <main className="relative flex min-h-dvh flex-1 flex-col items-center justify-center overflow-hidden bg-ink px-6 py-20 text-center">
      {/* The coin texture the landing page uses, dimmed to a grain, and a
          gold glow behind the wordmark. Both sit above <main>'s own black
          background (a negative z-index would hide them behind it) and below
          the content, which carries its own stacking context. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[url('/gold_coin.png')] bg-cover bg-center opacity-40"
      />
      {/* Scrim over the coins — at full strength they swallow the copy. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-ink/80" />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 size-[42rem] max-w-[140vw] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(212,166,42,0.42) 0%, rgba(212,166,42,0.14) 45%, transparent 70%)",
        }}
      />

      <div className="relative flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-xl text-gold">
          ◆
        </span>
        <span className="text-2xl font-bold tracking-tight text-white">
          GOLD<span className="text-gold">.BD</span>
        </span>
      </div>

      <p className="relative mt-10 font-display text-xs uppercase tracking-[0.35em] text-gold/80">
        Bangladesh&apos;s Trusted Digital Gold
      </p>

      <h1 className="relative mt-5 max-w-3xl bg-gradient-to-b from-gold-light via-gold-bright to-gold bg-clip-text text-4xl font-bold leading-tight text-transparent sm:text-6xl">
        দারুণ কিছু আসছে
      </h1>

      <p className="relative mt-6 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
        বাংলাদেশের সবচেয়ে নির্ভরযোগ্য ডিজিটাল গোল্ড প্ল্যাটফর্ম তৈরি হচ্ছে। ফোন থেকেই ২৪ ক্যারেট সোনা কেনা, বেচা আর
        নিরাপদে জমা রাখার সুবিধা নিয়ে আমরা আসছি খুব শিগগিরই।
      </p>

      {/* Divider — the same shine the landing page's gold buttons carry. */}
      <div className="relative mt-10 h-px w-40 bg-gradient-to-r from-transparent via-gold to-transparent" />

      <p className="relative mt-10 text-sm text-white/45">শেষ প্রস্তুতি চলছে — চোখ রাখুন।</p>
    </main>
  );
}
