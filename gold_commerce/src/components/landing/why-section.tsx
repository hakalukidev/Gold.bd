"use client";

import { useEffect } from "react";
import {
  Activity,
  Banknote,
  BookLock,
  ChevronLeft,
  ChevronRight,
  IdCard,
  Layers,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setActiveWhyTab, type WhyTab } from "@/store/slices/ui-slice";
import { useT } from "@/lib/i18n/use-t";
import { cn } from "@/lib/utils";
import { GoldTitle } from "@/components/shared/gold-title";

// Icons are matched to each slide's points by index (both slides carry
// exactly three points) rather than by title text, since the dictionary is
// locale-keyed and titles differ between `bn`/`en`.
const POINT_ICONS: Record<WhyTab, readonly LucideIcon[]> = {
  asset: [ShieldCheck, Banknote, Layers],
  platform: [BookLock, IdCard, Activity],
};

// Slide order for the carousel. Still driven by the `ui` slice's
// `activeWhyTab` so the active slide survives a locale switch / re-render.
const SLIDES = ["asset", "platform"] as const satisfies readonly WhyTab[];

const AUTOPLAY_MS = 8000;

// Fanned "card deck" look: the outer two cards rotate around the vertical
// axis (a horizontal tilt, via `perspective()` + `rotateY()` — not an
// in-plane rotate) so the row reads as angled cards rather than flat tiles,
// while the centre card stays flat and slightly larger to anchor the row.
// Each card straightens on hover. Written as full `transform` values (not
// Tailwind's `scale-*`/`rotate-*` utilities) so nothing else composes into
// the same CSS variable and silently overrides it. Tilt only applies at
// `sm:` and up — below that the grid is a single column, where a 3D tilt
// would just look broken.
const CARD_TRANSFORMS = [
  "sm:origin-right sm:opacity-90 sm:[transform:perspective(1100px)_rotateY(24deg)_scale(0.93)] sm:hover:opacity-100 sm:hover:[transform:perspective(1100px)_rotateY(0deg)_scale(1.03)]",
  "sm:z-10 sm:[transform:scale(1.08)] sm:hover:[transform:scale(1.12)]",
  "sm:origin-left sm:opacity-90 sm:[transform:perspective(1100px)_rotateY(-24deg)_scale(0.93)] sm:hover:opacity-100 sm:hover:[transform:perspective(1100px)_rotateY(0deg)_scale(1.03)]",
] as const;

function WhySlide({ tab, active }: { tab: WhyTab; active: boolean }) {
  const t = useT();
  const content = t.why[tab];
  const icons = POINT_ICONS[tab];

  return (
    <div className="w-full shrink-0 px-1 pb-12" aria-hidden={!active}>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-balance sm:text-3xl">
          <GoldTitle text={content.heading} />
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-neutral-600 dark:text-neutral-300">{content.intro}</p>
      </div>

      <div className="mt-16 grid gap-6 sm:grid-cols-3 sm:gap-5">
        {content.points.map((point, i) => {
          const Icon = icons[i];
          return (
            <div
              key={point.title}
              className={cn(
                "card-gold-premium group relative rounded-md p-6 transition-transform duration-500 ease-out sm:hover:z-20",
                i === 1 ? "shine-delay-1" : i === 2 ? "shine-delay-2" : undefined,
                CARD_TRANSFORMS[i]
              )}
            >
              <span className="flex size-16 items-center justify-center rounded-full bg-black/10 text-[#3a2405] ring-1 ring-black/10">
                <Icon className="size-8" strokeWidth={1.5} />
              </span>
              <p className="mt-4 font-semibold text-[#3a2405]">{point.title}</p>
              <p className="mt-2 text-sm text-[#4a2f08]/80">{point.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WhySection() {
  const activeTab = useAppSelector((state) => state.ui.activeWhyTab);
  const dispatch = useAppDispatch();
  const t = useT();

  const index = Math.max(0, SLIDES.indexOf(activeTab as (typeof SLIDES)[number]));

  function goTo(next: number) {
    dispatch(setActiveWhyTab(SLIDES[(next + SLIDES.length) % SLIDES.length]));
  }

  // Autoplay restarts whenever the slide changes, so a manual prev/next click
  // gives the reader a full interval on the slide they picked.
  useEffect(() => {
    const timer = setInterval(() => {
      dispatch(setActiveWhyTab(SLIDES[(index + 1) % SLIDES.length]));
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [index, dispatch]);

  return (
    <section id="why" className="relative isolate scroll-mt-24 overflow-hidden bg-background py-20">
      {/* Gold coin backdrop, kept sharp (no blur) and light. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20 bg-[url('/gold_coin.png')] bg-cover bg-center opacity-20"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-background via-background/60 to-neutral-100 dark:from-ink dark:via-ink/60 dark:to-ink-light"
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* ---------- Slides ---------- */}
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {SLIDES.map((tab) => (
              <WhySlide key={tab} tab={tab} active={tab === activeTab} />
            ))}
          </div>
        </div>

        {/* ---------- Carousel controls ---------- */}
        <div className="mt-2 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label={t.why.prevSlide}
            className="flex size-9 items-center justify-center rounded-full border border-black/15 text-neutral-600 transition-colors hover:border-gold/60 hover:text-gold dark:border-white/15 dark:text-neutral-300"
          >
            <ChevronLeft className="size-4" />
          </button>

          <div className="flex items-center gap-2">
            {SLIDES.map((tab, i) => (
              <button
                key={tab}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`${t.why.goToSlide}: ${t.why[tab === "asset" ? "tabAsset" : "tabPlatform"]}`}
                aria-current={i === index}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === index ? "w-8 bg-gold" : "w-3 bg-black/25 hover:bg-black/40 dark:bg-white/25 dark:hover:bg-white/40"
                )}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label={t.why.nextSlide}
            className="flex size-9 items-center justify-center rounded-full border border-black/15 text-neutral-600 transition-colors hover:border-gold/60 hover:text-gold dark:border-white/15 dark:text-neutral-300"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
