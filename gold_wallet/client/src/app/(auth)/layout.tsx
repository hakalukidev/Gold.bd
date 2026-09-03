import Image from "next/image";
import { COMMERCE_URL } from "@/lib/site-links";
import { Gem, Landmark, ShieldCheck, Zap } from "lucide-react";

const TRUST_POINTS = [
  { icon: ShieldCheck, label: "100% 24K backed" },
  { icon: Landmark, label: "Insured vault" },
  { icon: Zap, label: "Instant buy & sell" },
];

/** Split-screen auth shell: a black brand panel carrying the gold illustration
 * on the left, the form column on the right. The panel is desktop-only — below
 * `lg` the form column takes the full width and gets its own compact logo.
 *
 * The shell is pinned to exactly one viewport (`h-svh`, no page scroll) so the
 * brand panel always fills the screen; the form column scrolls on its own when
 * a taller form (register) or a short viewport needs it. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex h-svh flex-1 flex-col overflow-hidden lg:grid lg:grid-cols-[1.05fr_1fr] xl:grid-cols-[1.15fr_1fr]">
      <aside className="relative hidden h-full flex-col justify-between overflow-hidden bg-ink p-10 xl:p-14 lg:flex">
        {/* The illustration fills the whole panel; the copy sits on top of it,
            kept legible by the ink scrim gradients below. */}
        <Image
          src="/login_banner.png"
          alt="Gold coins, bars and a savings jar"
          fill
          priority
          sizes="(min-width: 1024px) 55vw, 100vw"
          className="object-cover object-center"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-ink from-25% via-ink/80 via-60% to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-ink/90 via-ink/45 to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-r from-transparent to-ink/70"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-gold/30 to-transparent"
        />

        <a href={COMMERCE_URL} className="relative flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full border border-gold/40 bg-ink/60 text-gold backdrop-blur-sm">
            <Gem className="size-5" />
          </span>
          <span className="text-lg font-bold tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)]">
            GOLD<span className="text-gold">.BD</span>
          </span>
        </a>

        <div className="relative">
          <p className="font-display text-[11px] tracking-[0.28em] text-gold uppercase">Trusted gold. Pure value.</p>
          <h2 className="mt-3 max-w-md text-3xl leading-tight font-bold text-balance text-white xl:text-4xl">
            Own real gold, digitally.
          </h2>
          <p className="mt-3 max-w-md text-sm text-white/75">
            Buy, sell and hold 24K gold from your phone — every gram backed by metal in an insured vault and tracked on
            an auditable ledger.
          </p>
          <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-3">
            {TRUST_POINTS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2 text-xs font-medium text-white/85">
                <Icon className="size-4 text-gold" strokeWidth={1.75} />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="relative flex h-full min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-5 py-8 sm:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_45%_at_50%_0%,color-mix(in_oklch,var(--color-gold)_10%,transparent),transparent)] lg:hidden"
        />
        <div className="my-auto w-full max-w-sm py-2">
          <a href={COMMERCE_URL} className="mb-6 flex items-center justify-center gap-2.5 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold">
              <Gem className="size-4.5" />
            </span>
            <span className="text-base font-bold tracking-tight">
              GOLD<span className="text-gold">.BD</span>
            </span>
          </a>
          {children}
        </div>
      </div>
    </main>
  );
}
