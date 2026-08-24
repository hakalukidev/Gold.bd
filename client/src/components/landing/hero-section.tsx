"use client";

import { useEffect, useRef } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Award, Headset, ShieldCheck, ShoppingBag, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/use-t";
import { HeroPriceBadge } from "./hero-price-badge";
import { TrustFeatures } from "./trust-features";

const GoldCoinScene = dynamic(() => import("@/components/landing/gold-coin-scene"), {
  ssr: false,
  loading: () => <div className="mx-auto aspect-square w-full animate-pulse rounded-full bg-gold/10" />,
});

const HIGHLIGHT_ICONS = [Award, ShieldCheck, Headset] as const;

export function HeroSection() {
  const t = useT();
  const coinParallaxRef = useRef<HTMLDivElement>(null);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  function handleMouseMove(e: ReactMouseEvent<HTMLDivElement>) {
    if (reducedMotionRef.current || !coinParallaxRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width - 0.5;
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    coinParallaxRef.current.style.transform = `translate3d(${relX * 24}px, ${relY * 16}px, 0)`;
  }

  function handleMouseLeave() {
    if (coinParallaxRef.current) coinParallaxRef.current.style.transform = "translate3d(0, 0, 0)";
  }

  return (
    <div
      className="relative isolate flex min-h-[calc(100vh-9rem)] flex-col overflow-hidden bg-black lg:h-[calc(100vh-9rem)]"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <section className="relative flex flex-1 flex-col justify-center-safe">
        <div className="relative mx-auto grid w-full max-w-6xl place-items-center gap-3 px-4 py-2 sm:px-8 sm:py-4 lg:grid-cols-2 lg:gap-6 lg:px-10 lg:py-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="min-w-0  text-center lg:text-left"
          >
            <p className=" text-base font-semibold tracking-[0.2em] text-white uppercase sm:text-xl">
              {t.hero.eyebrow}
            </p>

            <h1 className="font-sans text-5xl leading-[1] font-black tracking-tight text-gold uppercase sm:text-6xl lg:text-[64px]">
              {t.hero.headingLine1}
              <br />
              {t.hero.headingLine2Before}
              {t.hero.headingLine2Gold}
              {t.hero.headingLine2After}
            </h1>

            <div className="flex flex-wrap items-center my-2 justify-center gap-y-2 sm:my-3 lg:justify-start">
              {t.hero.highlights.map((highlight, i) => {
                const Icon = HIGHLIGHT_ICONS[i];
                return (
                  <div key={highlight.label} className="flex items-center">
                    {i > 0 && <span aria-hidden="true" className="mx-4 h-9 w-px shrink-0 bg-white/15 sm:mx-5" />}
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-11 shrink-0 items-center justify-center text-gold">
                        <Icon className="size-8" strokeWidth={1.75} />
                      </span>
                      <span className="max-w-16 text-[9px] leading-tight font-semibold tracking-wide text-neutral-200 uppercase sm:max-w-20 sm:text-[10px]">
                        {highlight.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col  items-center gap-3 pt-1 sm:flex-row lg:justify-start">
              <Button
                size="lg"
                variant="gold-solid"
                nativeButton={false}
                className="h-12 w-full gap-2 px-6 text-sm sm:w-auto"
                render={
                  <Link href="/products/gold">
                    <ShoppingBag className="size-4" />
                    {t.hero.ctaPrimary}
                  </Link>
                }
              />
              <Button
                size="lg"
                variant="gold-outline"
                nativeButton={false}
                className="h-12 w-full gap-2 px-6 text-sm sm:w-auto"
                render={
                  <a href="#rate-history">
                    {t.hero.ctaSecondary}
                    <TrendingUp className="size-4" />
                  </a>
                }
              />
            </div>

            <div className="mt-2 flex justify-center sm:mt-3 lg:justify-start">
              <HeroPriceBadge />
            </div>
          </motion.div>

          {/* ---------- Gold coin visual ---------- */}
          {/* The sizing wrapper is deliberately a plain div, with the mount animation
              on the inner motion.div: the background layer below must not sit inside
              an animated element, since `opacity < 1` and `transform` both turn that
              element into an isolated compositing group — which traps the layer and
              paints its black field over the copy column for the length of the intro. */}
          <div className="relative mx-auto w-full min-w-0 max-w-44 self-center sm:max-w-56 lg:max-w-72 lg:self-center">
            {/* Atmospheric gold glow, light trail and dust — a rendered asset rather
                than hand-rolled gradients. It lives inside the coin column (not as a
                full-bleed hero layer) so its light ring stays centred under the coin at
                every breakpoint. Sizing/offsets are derived from the asset itself: the
                ring's centre sits at 69.0% / 75.8% of the 1672x941 image, and the ring
                is 44.5% of the image wide. At width:364% the ring lands at ~2x the coin's
                rendered diameter, with its centre at 50% / 94% of this box — i.e. just
                below the coin's lowest float position, so the coin reads as hovering
                over it. It is far wider than the coin box and overlaps the copy column,
                so it sits at `-z-10` to paint behind all hero content (the hero root's
                `isolate` is what makes that negative index resolve against the hero
                rather than dropping it behind the page background). */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-[-61%] left-[-201%] -z-10 aspect-1672/941 w-[364%] bg-[url('/hero_background_2.webp')] bg-size-[100%_100%] bg-no-repeat opacity-90"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
              className="relative"
            >
              <div ref={coinParallaxRef} className="relative transition-transform duration-300 ease-out">
                {/* Tight golden halo hugging the coin, layered over the background image's own glow. */}
                <div className="pointer-events-none absolute -inset-10 rounded-full bg-[radial-gradient(circle,rgba(244,198,78,0.25)_0%,rgba(212,166,42,0.12)_25%,transparent_65%)] blur-[60px]" />

                <div className="coin-float">
                  <GoldCoinScene />
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ---------- Trust features panel ---------- */}
        <div className="relative mx-auto w-full max-w-6xl px-4 pb-2 sm:px-8 sm:pb-3 lg:px-10 lg:pb-1">
          <div className="flex rounded-md border border-gold/20 bg-white/3 px-4 py-2 backdrop-blur-sm sm:py-2.5">
            <TrustFeatures />
          </div>
        </div>
      </section>
    </div>
  );
}
