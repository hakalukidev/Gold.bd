"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { ArrowLeftRight, Banknote, Coins, Gem, HandCoins, Percent, TrendingUp } from "lucide-react";
import { useGoldRate } from "@/hooks/use-gold-rate";
import { useT } from "@/lib/i18n/use-t";
import { formatBDT } from "@/lib/format";
import { LandingHeader } from "@/components/landing/landing-header";
import { GoldPriceTicker } from "@/components/landing/gold-price-ticker";
import { LiveBadge } from "@/components/landing/today-price-section";
import { GoldCoinIcon, SilverCoinIcon } from "@/components/landing/dollar-coin-icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// 1 bhori (also spelled vori/tola), the standard South Asian gold-trading
// unit, equals this many grams — the figure used across the BD jewellery trade.
const BHORI_TO_GRAM = 11.6638038;

// Nisab: the zakat-eligibility threshold, expressed as the value of 87.48
// grams of pure (24K) gold — the traditional 7.5-tola figure.
const NISAB_GRAMS = 87.48;

const PURITY_OPTIONS = [24, 22, 21, 18] as const;

// Drives both the quick-nav chip row and each CalcCard's icon badge, so the
// two stay in sync by construction instead of two separately maintained lists.
const SECTIONS = [
  { id: "gold", icon: Coins },
  { id: "silver", icon: Gem },
  { id: "making-charge", icon: Percent },
  { id: "bhori-gram", icon: ArrowLeftRight },
  { id: "zakat", icon: HandCoins },
] as const;

// Complete, statically-written class strings per accent — swapped as a whole
// unit rather than built from an interpolated color name, so Tailwind's build
// scanner (which reads source text, not runtime values) can always see them.
const CARD_ACCENT_CLASSES = {
  gold: { hoverBorder: "hover:border-gold/30", badge: "bg-gold/15 text-gold", index: "text-gold/70" },
  silver: { hoverBorder: "hover:border-neutral-300/40", badge: "bg-neutral-300/15 text-neutral-200", index: "text-neutral-300/80" },
} as const;

function CalcCard({
  id,
  icon: Icon,
  index,
  title,
  description,
  accent = "gold",
  children,
}: {
  id: string;
  icon: ComponentType<{ className?: string }>;
  index: number;
  title: string;
  description: string;
  accent?: keyof typeof CARD_ACCENT_CLASSES;
  children: React.ReactNode;
}) {
  const a = CARD_ACCENT_CLASSES[accent];
  return (
    <section id={id} className={`rounded-md border border-white/10 bg-white/5 p-4 transition-colors sm:p-5 ${a.hoverBorder}`}>
      <div className="flex items-start gap-3">
        <span className={`flex size-8 shrink-0 items-center justify-center rounded-md ${a.badge}`}>
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className={`text-xs font-semibold ${a.index}`}>{String(index).padStart(2, "0")}</span>
            <h2 className="text-lg font-bold text-white sm:text-xl">{title}</h2>
          </div>
          <p className="mt-0.5 hidden text-sm text-neutral-400 sm:block">{description}</p>
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-neutral-400" htmlFor={htmlFor}>
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function NumberInput({ id, value, onChange }: { id?: string; value: string; onChange: (v: string) => void }) {
  return (
    <input
      id={id}
      type="number"
      min="0"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full rounded-md border border-white/15 bg-ink px-3 text-sm text-white outline-none focus:border-gold/60"
    />
  );
}

function ReadonlyField({ value }: { value: string }) {
  return (
    <div className="flex h-10 w-full items-center rounded-md border border-white/10 bg-ink px-3 text-sm text-white">
      {value}
    </div>
  );
}

/** Splits `n` items into ascending row sizes (1, 2, 3, …) — rendered top-to-bottom
 *  this reads as a pile with a narrow apex and a wide base, like stacked coins/bundles.
 *  Any leftover (when `n` isn't a perfect triangular number) is folded into the
 *  widest rows rather than tacked on as a new, smaller trailing row — otherwise
 *  that last row reads as a stray item that's drifted off the pile. */
function pileRows(n: number): number[] {
  if (n <= 0) return [];
  let rowCount = 1;
  while (((rowCount + 1) * (rowCount + 2)) / 2 <= n) rowCount++;

  const rows = Array.from({ length: rowCount }, (_, i) => i + 1);
  let remainder = n - (rowCount * (rowCount + 1)) / 2;
  let i = rows.length - 1;
  while (remainder > 0) {
    rows[i] += 1;
    remainder--;
    i = i === 0 ? rows.length - 1 : i - 1;
  }
  return rows;
}

// Multi-stop gradients so each bar catches a couple of bright reflective
// bands rather than one flat sheen, like real polished bullion.
const BAR_GRADIENTS = {
  gold: "linear-gradient(100deg, #7a5a12 0%, #f6e3a8 12%, #d4a62a 30%, #fce8a8 48%, #b8860b 66%, #f0cf72 82%, #8a6a1c 100%)",
  silver: "linear-gradient(100deg, #5b6470 0%, #f4f6f8 12%, #b6bec8 30%, #ffffff 48%, #7c848d 66%, #e3e7ea 82%, #5b6470 100%)",
} as const;

/** Deterministic "random-looking" offset from an integer seed — safe for SSR
 *  (unlike Math.random(), it renders identically on server and client) but
 *  still gives each bar its own slight, non-repeating settle. */
function jitter(seed: number, range: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  const frac = x - Math.floor(x);
  return (frac * 2 - 1) * range;
}

/** One bullion bar — a trapezoidal ingot silhouette (narrower top, wider
 *  base, like a real bar's tapered mould), a banded gradient for a glossy
 *  reflective sheen, an all-around inset bevel for a moulded-metal edge, and
 *  a debossed stamp rectangle so it reads as an engraved ingot rather than a
 *  plain gradient block (real bars are too small here for readable text, so
 *  the stamp's outline alone carries "this has been struck/engraved"). */
function GoldBar({ background, seed }: { background: string; seed: number }) {
  return (
    <div
      className="relative h-3 w-7 shrink-0 ring-1 ring-black/60"
      style={{
        clipPath: "polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%)",
        background,
        transform: `translateY(${jitter(seed, 0.8)}px)`,
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(0,0,0,0.45), inset 1px 0 0 rgba(255,255,255,0.2), inset -1px 0 0 rgba(0,0,0,0.35)",
      }}
    >
      <span
        className="absolute inset-x-[22%] top-1/2 -translate-y-1/2"
        style={{
          height: "50%",
          borderTop: "0.5px solid rgba(0,0,0,0.55)",
          borderLeft: "0.5px solid rgba(0,0,0,0.55)",
          borderBottom: "0.5px solid rgba(255,255,255,0.4)",
          borderRight: "0.5px solid rgba(255,255,255,0.4)",
        }}
      />
    </div>
  );
}

/** A neat pyramid of stacked bars in the right pan — built the same way as
 *  `MoneyPile`'s bundles (ascending row sizes), so the base row is widest and
 *  each row above nests in the gaps of the row below, the way bullion bars
 *  actually stack. The base (frontmost) row overlaps the row above it less
 *  than the rest, so it reads as sitting slightly forward instead of jammed
 *  in tight. `variant` swaps the metal tint without touching the pyramid logic. */
function BarPile({ count, variant = "gold" }: { count: number; variant?: keyof typeof BAR_GRADIENTS }) {
  if (count === 0) return <span className="text-xs text-neutral-600">—</span>;
  const background = BAR_GRADIENTS[variant];
  const rows = pileRows(count);
  return (
    <div className="flex flex-col items-center">
      {rows.map((rowCount, ri) => {
        const isFrontRow = ri === rows.length - 1;
        return (
          <div key={ri} className="flex -space-x-0.5" style={ri > 0 ? { marginTop: isFrontRow ? -1 : -3 } : undefined}>
            {Array.from({ length: rowCount }, (_, ci) => (
              <GoldBar key={ci} background={background} seed={ri * 7 + ci} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

/** Small stacked taka-note bundles — the left-pan pile, sized by the entered amount. */
function MoneyPile({ count }: { count: number }) {
  if (count === 0) return <span className="text-xs text-neutral-600">—</span>;
  return (
    <div className="flex flex-col items-center">
      {pileRows(count).map((rowCount, i) => (
        <div key={i} className="flex -space-x-2" style={i > 0 ? { marginTop: -4 } : undefined}>
          {Array.from({ length: rowCount }, (_, j) => (
            <span key={j} className="relative h-3 w-7 rounded-[2px] bg-linear-to-b from-[#d9c98a] to-[#a8935a] ring-1 ring-black/40">
              <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 bg-[#f4ecc9]" />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/** A short round-dashed line reads as a beaded chain without any custom link
 *  geometry — it's a single straight SVG line, so it can't render crooked. */
function Chain({ x1, y1, x2, y2, className }: { x1: number; y1: number; x2: number; y2: number; className: string }) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      className={className}
      strokeWidth="2.6"
      strokeDasharray="0.1 5.5"
      strokeLinecap="round"
    />
  );
}

// Every color used by the scale's metal parts (everything except the pan
// itself, which already has its own gradient), as complete static class
// strings per metal — see the note on CARD_ACCENT_CLASSES for why these
// aren't built from an interpolated color name.
const APPARATUS_CLASSES = {
  gold: {
    beam: "fill-gold",
    pivot: "fill-gold-bright",
    pivotGlow: "drop-shadow(0 0 6px rgba(244,198,78,0.7))",
    pedestalFoot: "fill-gold/70 stroke-gold/90",
    pedestalStep: "fill-gold/80",
    column: "fill-gold/80 stroke-gold/40",
    fluting: "stroke-gold/40",
    post: "fill-gold/80",
    ring: "fill-none stroke-gold-bright",
    chain: "stroke-gold/70",
    scrollStroke: "fill-none stroke-gold",
    bright: "fill-gold-bright",
    urnNeck: "fill-gold/80",
    crossbar: "fill-gold/80",
    tasselLine: "stroke-gold/60",
  },
  silver: {
    beam: "fill-neutral-300",
    pivot: "fill-neutral-100",
    pivotGlow: "drop-shadow(0 0 6px rgba(226,232,240,0.7))",
    pedestalFoot: "fill-neutral-400/70 stroke-neutral-200/90",
    pedestalStep: "fill-neutral-400/80",
    column: "fill-neutral-400/80 stroke-neutral-400/40",
    fluting: "stroke-neutral-400/40",
    post: "fill-neutral-400/80",
    ring: "fill-none stroke-neutral-100",
    chain: "stroke-neutral-300/70",
    scrollStroke: "fill-none stroke-neutral-300",
    bright: "fill-neutral-100",
    urnNeck: "fill-neutral-400/80",
    crossbar: "fill-neutral-400/80",
    tasselLine: "stroke-neutral-300/60",
  },
} as const;

/** A deep, brass-shaded bowl like a real hanging scale pan — round body first,
 *  then a rim ellipse painted on top of it, symmetric by construction since
 *  the body's one control point sits on the pan's own vertical axis. */
function Pan({ cx, gradId }: { cx: number; gradId: string }) {
  const rimY = 150;
  const w = 40;
  return (
    <>
      <path d={`M ${cx - w} ${rimY} Q ${cx} ${rimY + 42} ${cx + w} ${rimY} Z`} fill={`url(#${gradId})`} stroke="rgba(0,0,0,0.35)" strokeWidth="1" />
      <path
        d={`M ${cx - w * 0.5} ${rimY + 12} Q ${cx - w * 0.1} ${rimY + 5} ${cx + w * 0.15} ${rimY + 11}`}
        className="fill-none stroke-white/50"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <ellipse cx={cx} cy={rimY} rx={w} ry="9" fill={`url(#${gradId})`} stroke="rgba(0,0,0,0.35)" strokeWidth="1" />
      <ellipse cx={cx} cy={rimY} rx={w - 7} ry="5.5" className="fill-none stroke-black/25" strokeWidth="1" />
    </>
  );
}

/** One side's ring with a 3-chain fan straight down to the rim, and the pan
 *  hanging dead-center under that same ring — `ringX` is the only x used for
 *  both, so the pan can't drift sideways off the ring the way a separate
 *  ring/pan-center pair could. */
function PanAssembly({
  ringX,
  gradId,
  metal,
}: {
  ringX: number;
  gradId: string;
  metal: (typeof APPARATUS_CLASSES)[keyof typeof APPARATUS_CLASSES];
}) {
  const beamY = 52;
  const rimY = 150;
  const w = 40;
  return (
    <>
      <circle cx={ringX} cy={beamY} r="6.5" className={metal.ring} strokeWidth="2.5" />
      <Chain x1={ringX} y1={beamY} x2={ringX - w} y2={rimY} className={metal.chain} />
      <Chain x1={ringX} y1={beamY} x2={ringX} y2={rimY - 9} className={metal.chain} />
      <Chain x1={ringX} y1={beamY} x2={ringX + w} y2={rimY} className={metal.chain} />
      <Pan cx={ringX} gradId={gradId} />
    </>
  );
}

// One carved acanthus-scroll wing, in local coordinates with its origin at the
// center ornament — drawn once and mirrored for the other side (below) so the
// two wings are provably identical rather than two hand-typed paths.
const SCROLL_WING_PATH = "M 4 -2 C 16 -9 32 -6 38 3 C 43 10 39 17 31 16 C 37 12 35 5 27 4 C 19 3 13 7 10 13";
const TASSEL_OFFSETS = [-27, -13.5, 0, 13.5, 27];

/** The ornamental finial above the pivot — a center urn flanked by mirrored
 *  scroll wings, with a fringe of tassels hanging from the crossbar. */
function CrownOrnament({ metal }: { metal: (typeof APPARATUS_CLASSES)[keyof typeof APPARATUS_CLASSES] }) {
  return (
    <g>
      <g transform="translate(200,14)">
        <path d={SCROLL_WING_PATH} className={metal.scrollStroke} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="38" cy="9" r="2" className={metal.bright} />
      </g>
      <g transform="translate(200,14) scale(-1,1)">
        <path d={SCROLL_WING_PATH} className={metal.scrollStroke} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="38" cy="9" r="2" className={metal.bright} />
      </g>

      {/* center urn */}
      <path d="M 195 8 L 200 2 L 205 8 Z" className={metal.bright} />
      <ellipse cx="200" cy="14" rx="5" ry="7" className={metal.bright} />
      <rect x="197" y="21" width="6" height="9" className={metal.urnNeck} />

      {/* crossbar + hanging tassels */}
      <rect x="163" y="30" width="74" height="3" rx="1.5" className={metal.crossbar} />
      {TASSEL_OFFSETS.map((dx) => (
        <g key={dx}>
          <line x1={200 + dx} y1="33" x2={200 + dx} y2="37" className={metal.tasselLine} strokeWidth="1" />
          <ellipse cx={200 + dx} cy="40" rx="2" ry="3" className={metal.bright} />
        </g>
      ))}
    </g>
  );
}

/**
 * The দাঁড়িপাল্লা itself — an ornate justice-scale silhouette (scrollwork
 * finial, fluted pedestal, chains, rimmed pans) as one SVG so the whole
 * apparatus scales as a unit; the two pan piles are separate absolutely
 * positioned overlays (aligned to the SVG's pan coordinates as percentages)
 * so they can be ordinary DOM content instead of baked into the drawing.
 */
const PAN_METAL_STOPS = {
  // light upper-left, dark lower-right, like a lit metal bowl
  gold: [
    { offset: "0%", color: "#f6e3a8" },
    { offset: "45%", color: "#d4a62a" },
    { offset: "100%", color: "#8a6a1c" },
  ],
  silver: [
    { offset: "0%", color: "#f4f6f8" },
    { offset: "45%", color: "#b6bec8" },
    { offset: "100%", color: "#6b7280" },
  ],
} as const;

function BalanceScale({
  left,
  right,
  metal: metalKey = "gold",
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  metal?: keyof typeof PAN_METAL_STOPS;
}) {
  const uid = useId();
  const gradId = `${uid}-pan-grad`;
  const metal = APPARATUS_CLASSES[metalKey];

  return (
    <div className="relative mx-auto mt-3 aspect-[2/1] max-w-[260px] sm:max-w-xs">
      <svg viewBox="0 0 400 200" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="0.15" y1="0.1" x2="0.9" y2="1">
            {PAN_METAL_STOPS[metalKey].map((s) => (
              <stop key={s.offset} offset={s.offset} stopColor={s.color} />
            ))}
          </linearGradient>
        </defs>

        {/* fluted pedestal */}
        <ellipse cx="200" cy="193" rx="56" ry="7" className={metal.pedestalFoot} strokeWidth="1" />
        <ellipse cx="200" cy="181" rx="38" ry="6" className={metal.pedestalStep} />
        <path d="M 192 56 L 208 56 L 211 178 L 189 178 Z" className={metal.column} strokeWidth="1" />
        <line x1="196" y1="86" x2="204" y2="86" className={metal.fluting} strokeWidth="1" />
        <line x1="195" y1="122" x2="205" y2="122" className={metal.fluting} strokeWidth="1" />

        {/* scrollwork finial */}
        <CrownOrnament metal={metal} />
        <rect x="197" y="33" width="6" height="16" className={metal.post} />

        {/* beam */}
        <rect x="50" y="49" width="300" height="6" rx="3" className={metal.beam} />
        <circle cx="200" cy="52" r="8" className={metal.pivot} style={{ filter: metal.pivotGlow }} />

        {/* pans — ring, hanging chains and bowl, mirrored left/right from one formula */}
        <PanAssembly ringX={50} gradId={gradId} metal={metal} />
        <PanAssembly ringX={350} gradId={gradId} metal={metal} />
      </svg>

      <div className="absolute bottom-[25%] left-[12.5%] -translate-x-1/2">{left}</div>
      <div className="absolute bottom-[25%] left-[87.5%] -translate-x-1/2">{right}</div>
    </div>
  );
}

/** Purely decorative pile size — grows with the real number so the scale visibly
 *  "fills up" as you type, without pretending to be an exact count. Caps at
 *  `max` so a large amount doesn't spill coins/bundles off the pan. */
function pileCount(value: number, step: number, max = 10): number {
  return Math.min(max, Math.round(value / step) || (value > 0 ? 1 : 0));
}

/** The editable "money in" field under the left pan — shared by both metal
 *  calculators so the input styling (banknote icon, focus ring) stays in sync. */
const FIELD_ACCENT_CLASSES = {
  gold: "focus:border-gold/60",
  silver: "focus:border-neutral-300/60",
} as const;

function MoneyAmountField({
  id,
  label,
  value,
  onChange,
  accent = "gold",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  accent?: keyof typeof FIELD_ACCENT_CLASSES;
}) {
  return (
    <Field label={label} htmlFor={id}>
      <div className="relative">
        <Banknote className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-neutral-500" />
        <input
          id={id}
          type="number"
          min="0"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`h-10 w-full rounded-md border border-white/15 bg-ink pr-3 pl-8 text-sm text-white outline-none ${FIELD_ACCENT_CLASSES[accent]}`}
        />
      </div>
    </Field>
  );
}

function GoldCalculator() {
  const t = useT();
  const c = t.calculatorPage.gold;
  const { data: rate } = useGoldRate();
  const [amount, setAmount] = useState("5000");

  const grams = useMemo(() => {
    const rateNum = rate ? Number(rate.pricePerGramBDT) : 0;
    const amountNum = Number(amount) || 0;
    return rateNum > 0 ? amountNum / rateNum : 0;
  }, [amount, rate]);

  const bundleCount = pileCount(Number(amount) || 0, 3000);
  const barCount = pileCount(grams, 1 / 3, 10);

  return (
    <CalcCard id="gold" icon={GoldCoinIcon} index={1} title={c.title} description={c.description}>
      {/* Current rate sits above the scale, like a ticker over the beam. */}
      <div className="text-center">
        <p className="text-xs text-neutral-400">{c.rateLabel}</p>
        <p className="mt-1 text-lg font-bold text-gold">{rate ? formatBDT(rate.pricePerGramBDT) : "…"}</p>
      </div>

      {/* দাঁড়িপাল্লা — money piles up in the left pan, gold in the right, as you type. */}
      <BalanceScale left={<MoneyPile count={bundleCount} />} right={<BarPile count={barCount} />} />

      <div className="mx-auto mt-3 grid max-w-sm grid-cols-2 gap-5 sm:gap-8">
        <MoneyAmountField id="gold-amount" label={c.amountLabel} value={amount} onChange={setAmount} />
        <Field label={c.resultLabel}>
          <ReadonlyField value={`${grams.toFixed(3)} g`} />
        </Field>
      </div>
    </CalcCard>
  );
}

function SilverCalculator() {
  const t = useT();
  const c = t.calculatorPage.silver;
  const [amount, setAmount] = useState("2000");
  const [rate, setRate] = useState("385");

  const grams = useMemo(() => {
    const rateNum = Number(rate) || 0;
    const amountNum = Number(amount) || 0;
    return rateNum > 0 ? amountNum / rateNum : 0;
  }, [amount, rate]);

  const bundleCount = pileCount(Number(amount) || 0, 3000);
  const barCount = pileCount(grams, 1 / 3, 10);

  return (
    <CalcCard id="silver" icon={SilverCoinIcon} index={2} title={c.title} description={c.description} accent="silver">
      {/* Rate sits above the scale like the gold calculator's — but editable
          here, since silver has no live feed, just an indicative rate. */}
      <div className="mx-auto max-w-36">
        <label htmlFor="silver-rate" className="block text-center text-xs text-neutral-400">
          {c.rateLabel}
        </label>
        <input
          id="silver-rate"
          type="number"
          min="0"
          inputMode="decimal"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          className="mt-1 h-9 w-full rounded-md border border-white/15 bg-ink px-3 text-center text-sm font-semibold text-neutral-200 outline-none focus:border-neutral-300/60"
        />
      </div>

      {/* দাঁড়িপাল্লা — money piles up in the left pan, silver in the right, as you type. */}
      <BalanceScale metal="silver" left={<MoneyPile count={bundleCount} />} right={<BarPile count={barCount} variant="silver" />} />

      <div className="mx-auto mt-3 grid max-w-sm grid-cols-2 gap-5 sm:gap-8">
        <MoneyAmountField id="silver-amount" label={c.amountLabel} value={amount} onChange={setAmount} accent="silver" />
        <Field label={c.resultLabel}>
          <ReadonlyField value={`${grams.toFixed(3)} g`} />
        </Field>
      </div>
      <p className="mt-2 hidden text-center text-xs text-neutral-500 sm:block">{c.rateNote}</p>
    </CalcCard>
  );
}

function MakingChargeCalculator() {
  const t = useT();
  const c = t.calculatorPage.makingCharge;
  const { data: rate } = useGoldRate();
  const [weight, setWeight] = useState("1");
  const [ratePerGram, setRatePerGram] = useState("");
  const [chargePercent, setChargePercent] = useState("10");

  // Seed the rate field from the live gold rate once it loads — but only if
  // the user hasn't already typed their own value into it. Deliberately a
  // one-shot sync-on-arrival effect, not a derived value, so a later user
  // edit isn't clobbered by a rate refetch.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see comment above
    if (rate && ratePerGram === "") setRatePerGram(rate.pricePerGramBDT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate]);

  const { goldValue, chargeAmount, total } = useMemo(() => {
    const w = Number(weight) || 0;
    const r = Number(ratePerGram) || 0;
    const pct = Number(chargePercent) || 0;
    const gv = w * r;
    const ca = gv * (pct / 100);
    return { goldValue: gv, chargeAmount: ca, total: gv + ca };
  }, [weight, ratePerGram, chargePercent]);

  return (
    <CalcCard id="making-charge" icon={Percent} index={3} title={c.title} description={c.description}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={c.weightLabel} htmlFor="mc-weight">
          <NumberInput id="mc-weight" value={weight} onChange={setWeight} />
        </Field>
        <Field label={c.rateLabel} htmlFor="mc-rate">
          <NumberInput id="mc-rate" value={ratePerGram} onChange={setRatePerGram} />
        </Field>
        <Field label={c.chargeLabel} htmlFor="mc-charge">
          <NumberInput id="mc-charge" value={chargePercent} onChange={setChargePercent} />
        </Field>
      </div>
      <div className="mt-3 grid gap-3 border-t border-white/10 pt-3 sm:grid-cols-3">
        <Field label={c.goldValueLabel}>
          <ReadonlyField value={formatBDT(goldValue)} />
        </Field>
        <Field label={c.chargeAmountLabel}>
          <ReadonlyField value={formatBDT(chargeAmount)} />
        </Field>
        <Field label={c.totalLabel}>
          <div className="flex h-10 w-full items-center rounded-md border border-gold/40 bg-gold/10 px-3 text-sm font-semibold text-gold">
            {formatBDT(total)}
          </div>
        </Field>
      </div>
    </CalcCard>
  );
}

function BhoriGramCalculator() {
  const t = useT();
  const c = t.calculatorPage.bhoriGram;
  const [bhori, setBhori] = useState("1");
  const [grams, setGrams] = useState("11.6638");

  const gramsFromBhori = (Number(bhori) || 0) * BHORI_TO_GRAM;
  const bhoriFromGrams = (Number(grams) || 0) / BHORI_TO_GRAM;

  return (
    <CalcCard id="bhori-gram" icon={ArrowLeftRight} index={4} title={c.title} description={c.description}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid grid-cols-2 gap-3">
          <Field label={c.bhoriLabel} htmlFor="bg-bhori">
            <NumberInput id="bg-bhori" value={bhori} onChange={setBhori} />
          </Field>
          <Field label={c.gramLabel}>
            <ReadonlyField value={gramsFromBhori.toFixed(4)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={c.gramLabel} htmlFor="bg-grams">
            <NumberInput id="bg-grams" value={grams} onChange={setGrams} />
          </Field>
          <Field label={c.bhoriLabel}>
            <ReadonlyField value={bhoriFromGrams.toFixed(4)} />
          </Field>
        </div>
      </div>
    </CalcCard>
  );
}

function ZakatCalculator() {
  const t = useT();
  const c = t.calculatorPage.zakat;
  const { data: rate } = useGoldRate();
  const [weight, setWeight] = useState("0");
  const [purity, setPurity] = useState<(typeof PURITY_OPTIONS)[number]>(24);
  const [ratePerGram, setRatePerGram] = useState("");

  // Seed the rate field from the live gold rate once it loads — but only if
  // the user hasn't already typed their own value into it. Deliberately a
  // one-shot sync-on-arrival effect, not a derived value, so a later user
  // edit isn't clobbered by a rate refetch.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see comment above
    if (rate && ratePerGram === "") setRatePerGram(rate.pricePerGramBDT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate]);

  const { eligible, marketValue, zakatDue } = useMemo(() => {
    const w = Number(weight) || 0;
    const r = Number(ratePerGram) || 0;
    const pureGrams = w * (purity / 24);
    const isEligible = pureGrams >= NISAB_GRAMS;
    const value = w * r;
    return { eligible: isEligible, marketValue: value, zakatDue: isEligible ? value * 0.025 : 0 };
  }, [weight, purity, ratePerGram]);

  return (
    <CalcCard id="zakat" icon={HandCoins} index={5} title={c.title} description={c.description}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={c.weightLabel} htmlFor="zakat-weight">
          <NumberInput id="zakat-weight" value={weight} onChange={setWeight} />
        </Field>
        <Field label={c.purityLabel} htmlFor="zakat-purity">
          <select
            id="zakat-purity"
            value={purity}
            onChange={(e) => setPurity(Number(e.target.value) as (typeof PURITY_OPTIONS)[number])}
            className="h-10 w-full rounded-md border border-white/15 bg-ink px-3 text-sm text-white outline-none focus:border-gold/60"
          >
            {PURITY_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {k}K
              </option>
            ))}
          </select>
        </Field>
        <Field label={c.rateLabel} htmlFor="zakat-rate">
          <NumberInput id="zakat-rate" value={ratePerGram} onChange={setRatePerGram} />
        </Field>
      </div>

      <div className="mt-3 grid gap-3 border-t border-white/10 pt-3 sm:grid-cols-2">
        <Field label={c.marketValueLabel}>
          <ReadonlyField value={formatBDT(marketValue)} />
        </Field>
        <Field label={c.zakatDueLabel}>
          <div className="flex h-10 w-full items-center rounded-md border border-gold/40 bg-gold/10 px-3 text-sm font-semibold text-gold">
            {formatBDT(zakatDue)}
          </div>
        </Field>
      </div>

      <p className={`mt-2 text-xs font-medium ${eligible ? "text-emerald-400" : "text-neutral-500"}`}>
        {eligible ? c.eligible : c.notEligible}
      </p>
      <p className="mt-0.5 hidden text-xs text-neutral-500 sm:block">{c.nisabNote}</p>
    </CalcCard>
  );
}

// Maps each nav-chip section back to its i18n title — SECTIONS' ids are
// kebab-case (route anchors), t.calculatorPage's keys are camelCase.
const SECTION_LABEL_KEYS = {
  gold: "gold",
  silver: "silver",
  "making-charge": "makingCharge",
  "bhori-gram": "bhoriGram",
  zakat: "zakat",
} as const;

type SectionId = (typeof SECTIONS)[number]["id"];
const SECTION_IDS = SECTIONS.map((s) => s.id) as SectionId[];

export default function CalculatorPage() {
  const t = useT();
  const c = t.calculatorPage;
  const [active, setActive] = useState<SectionId>("gold");

  // Deep-link support: land on whichever calculator the URL hash names
  // (e.g. /calculator#zakat), same as the old anchor-scroll nav did. A
  // one-shot effect reading `window` (unavailable at SSR/initial-state time),
  // not a derived value.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see comment above
    if ((SECTION_IDS as string[]).includes(hash)) setActive(hash as SectionId);
  }, []);

  function selectTab(id: SectionId) {
    setActive(id);
    window.history.replaceState(null, "", `#${id}`);
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-ink">
      <div className="shrink-0">
        <GoldPriceTicker />
        <LandingHeader />
      </div>

      {/* ---------- Compact hero + tabs + the active calculator, sized to fit
          in the remaining viewport height without needing to scroll. ---------- */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(212,166,42,0.12),transparent)]" />

        <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-4 sm:px-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-gold/15 text-gold">
                <TrendingUp className="size-3.5" />
              </span>
              <LiveBadge label={t.todayPrice.live} />
            </div>
            <h1 className="mt-1.5 text-xl font-bold text-white sm:text-2xl">{c.heading}</h1>
            <p className="mt-1 hidden text-sm text-neutral-300 sm:block">{c.subheading}</p>
          </div>

          {/* Calculator + its switcher — the switcher is a right-hand rail
              panel (admin-panel-style: bordered card, left-rail active
              indicator) instead of the pill row above the fold. */}
          <Tabs
            value={active}
            onValueChange={(value) => selectTab(value as SectionId)}
            orientation="vertical"
            className="mt-4 flex-1 flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:gap-6"
          >
            <div className="min-w-0 flex-1">
              <TabsContent value="gold" keepMounted>
                <GoldCalculator />
              </TabsContent>
              <TabsContent value="silver" keepMounted>
                <SilverCalculator />
              </TabsContent>
              <TabsContent value="making-charge" keepMounted>
                <MakingChargeCalculator />
              </TabsContent>
              <TabsContent value="bhori-gram" keepMounted>
                <BhoriGramCalculator />
              </TabsContent>
              <TabsContent value="zakat" keepMounted>
                <ZakatCalculator />
              </TabsContent>
            </div>

            <TabsList className="h-fit w-full shrink-0 flex-col gap-1 rounded-md border border-white/10 bg-white/5 p-3 sm:w-56">
              {SECTIONS.map(({ id, icon: Icon }) => (
                <TabsTrigger
                  key={id}
                  value={id}
                  className={cn(
                    "w-full justify-start gap-2.5 rounded-md border-l-2 !border-transparent bg-transparent px-3 py-2 text-sm font-medium text-neutral-300 shadow-none transition-colors",
                    "hover:bg-white/5 hover:text-white",
                    "data-active:!border-gold data-active:!bg-gold/10 data-active:!text-gold data-active:!shadow-none"
                  )}
                >
                  <Icon className="size-4 shrink-0" strokeWidth={1.75} />
                  {c[SECTION_LABEL_KEYS[id]].title}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>
    </main>
  );
}
