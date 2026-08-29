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
    <div className="w-full shrink-0 px-1 pb-6" aria-hidden={!active}>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-balance text-white sm:text-3xl">{content.heading}</h2>
        <p className="mx-auto mt-3 max-w-xl text-neutral-300">{content.intro}</p>
      </div>

      <div className="mt-16 grid gap-6 sm:grid-cols-3 sm:gap-5">
        {content.points.map((point, i) => {
          const Icon = icons[i];
          return (
            <div
              key={point.title}
              className={cn(
                "group relative rounded-md border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/40 backdrop-blur-md transition-transform duration-500 ease-out sm:hover:z-20",
                CARD_TRANSFORMS[i]
              )}
            >
              <span className="flex text-gold">
                <Icon className="size-14" strokeWidth={1.25} />
              </span>
              <p className="mt-4 font-medium text-gold">{point.title}</p>
              <p className="mt-2 text-sm text-neutral-300">{point.description}</p>
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
    <section id="why" className="relative isolate scroll-mt-24 overflow-hidden bg-ink py-20">
      {/* Blurred gold coin backdrop. Oversized (-inset-24) so the blur's soft
          edges fall outside the section's clipped bounds instead of fading
          to nothing right at the boundary. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-24 -z-20 bg-[url('/gold_coin.png')] bg-cover bg-center opacity-50 blur-3xl saturate-150"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-ink via-ink/60 to-ink-light"
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
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label={t.why.prevSlide}
            className="flex size-9 items-center justify-center rounded-full border border-white/15 text-neutral-300 transition-colors hover:border-gold/60 hover:text-gold"
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
                  i === index ? "w-8 bg-gold" : "w-3 bg-white/25 hover:bg-white/40"
                )}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label={t.why.nextSlide}
            className="flex size-9 items-center justify-center rounded-full border border-white/15 text-neutral-300 transition-colors hover:border-gold/60 hover:text-gold"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
