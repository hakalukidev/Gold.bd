"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppDispatch } from "@/store/hooks";
import { addToCart } from "@/store/slices/cart-slice";
import { useMetalRate, type Metal } from "@/hooks/use-metal-rate";
import { PRODUCT_IMAGES, PRODUCT_WEIGHTS, effectivePricePerGram, type ProductForm, type ProductWeight } from "@/lib/products";
import { useT } from "@/lib/i18n/use-t";
import { formatBDT } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LandingHeader } from "@/components/landing/landing-header";
import { GoldPriceTicker } from "@/components/landing/gold-price-ticker";
import { StatusStrip } from "@/components/landing/status-strip";
import { LandingFooter } from "@/components/landing/landing-footer";

type Sku = { id: string; metal: Metal; form: ProductForm; weight: ProductWeight };

const METALS = ["gold", "silver"] as const;
const FORMS = ["bar", "coin"] as const;

// The full catalog: every metal × form × weight combination, in one stable
// order — built once, not per render, since it never depends on any state.
// The page for a given metal then filters this down by metal + the active
// bar/coin tab.
const SKUS: Sku[] = METALS.flatMap((metal) => FORMS.flatMap((form) => PRODUCT_WEIGHTS.map((weight) => ({ id: `${metal}-${form}-${weight.grams}`, metal, form, weight }))));

export function ProductCatalog({ metal }: { metal: Metal }) {
  const t = useT();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { data: goldRate } = useMetalRate("gold");
  const { data: silverRate } = useMetalRate("silver");

  const [form, setForm] = useState<ProductForm>("bar");

  const metalSkus = useMemo(() => SKUS.filter((s) => s.metal === metal && s.form === form), [metal, form]);

  const [selectedId, setSelectedId] = useState(metalSkus[0].id);
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  // Both queries already come back as the real 22K anchor rate (see
  // rate.controller.js) — no more back-solving a "fine" price to derive it.
  const pricePerGram22k = useMemo(() => {
    const gold22k = goldRate ? Number(goldRate.pricePerGramBDT) : null;
    const silver22k = silverRate ? Number(silverRate.pricePerGramBDT) : null;
    return { gold: gold22k, silver: silver22k } satisfies Record<Metal, number | null>;
  }, [goldRate, silverRate]);

  function skuTitle(sku: Sku) {
    const weightLabel = t.featured[sku.weight.key as "weight0_5" | "weight1" | "weight5" | "weight10"];
    const metalLabel = t.featured[sku.metal === "gold" ? "metalGold" : "metalSilver"];
    const formLabel = t.featured[sku.form === "bar" ? "formBar" : "formCoin"];
    return `${weightLabel} ${metalLabel} ${formLabel}`;
  }

  function skuPricing(sku: Sku) {
    const perGram = effectivePricePerGram(pricePerGram22k[sku.metal], sku.weight);
    const unitPrice = perGram !== null ? perGram * sku.weight.grams : null;
    return { perGram, unitPrice };
  }

  function selectSku(id: string) {
    setSelectedId(id);
    setQty(1);
  }

  function selectForm(nextForm: ProductForm) {
    if (nextForm === form) return;
    setForm(nextForm);
    const firstOfForm = SKUS.find((s) => s.metal === metal && s.form === nextForm);
    if (firstOfForm) selectSku(firstOfForm.id);
  }

  const selected = metalSkus.find((s) => s.id === selectedId) ?? metalSkus[0];
  const selectedTitle = skuTitle(selected);
  const selectedImage = PRODUCT_IMAGES[selected.metal][selected.form];
  const { unitPrice } = skuPricing(selected);
  const totalPrice = unitPrice !== null ? unitPrice * qty : null;

  function addSelectedToCart() {
    if (unitPrice === null) return;
    dispatch(addToCart({ id: selected.id, name: selectedTitle, image: selectedImage, unitPriceBDT: unitPrice, quantity: qty }));
  }

  function handleAddToCart() {
    addSelectedToCart();
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1600);
  }

  function handleBuyNow() {
    addSelectedToCart();
    router.push("/checkout");
  }

  return (
    <main className="flex flex-1 flex-col">
      <GoldPriceTicker />
      <LandingHeader />
      <StatusStrip />

      <div className="relative isolate overflow-hidden bg-background">
        {/* Ambient golden wash behind the whole page, echoing the hero's glow treatment.
            Viewport-fixed (not absolute) so it reads as a constant glow behind the page
            rather than fading out partway down a tall, scrollable product grid. */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_140%_70%_at_50%_-10%,rgba(244,198,78,0.16),transparent_70%),radial-gradient(ellipse_90%_70%_at_100%_30%,rgba(212,166,42,0.1),transparent_70%),radial-gradient(ellipse_90%_70%_at_0%_100%,rgba(244,198,78,0.1),transparent_70%),linear-gradient(180deg,transparent_0%,rgba(244,198,78,0.03)_50%,transparent_100%)]"
        />
        <div className="relative w-full overflow-hidden">
          <div className="pointer-events-none absolute top-1/2 right-0 h-24 w-1/2 max-w-2xl -translate-y-1/2 select-none sm:h-36 md:h-48 lg:h-56">
            <Image
              src="/product_bg.png"
              alt=""
              aria-hidden="true"
              fill
              sizes="50vw"
              priority
              className="object-contain object-right"
            />
          </div>
          <div className="relative mx-auto w-full max-w-4xl px-4 pt-6 pb-6 text-center sm:px-6 sm:pt-8 sm:pb-8 sm:text-left">
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{t.featured.heading}</h1>
            <p className="mt-3 text-muted-white">{t.productsPage.subheading}</p>
          </div>
        </div>

        <div className="py-16 sm:py-20">
          {/* ---------- Metal / form toggles ---------- */}
          <div className="mx-auto mt-8 flex max-w-6xl flex-wrap items-center justify-center gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-1 rounded-full border border-black/15 bg-black/5 p-1 dark:border-white/15 dark:bg-white/5">
              {METALS.map((m) => (
                <Link
                  key={m}
                  href={`/products/${m}`}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-xs font-bold tracking-wide uppercase transition-colors",
                    metal === m ? "bg-gold text-ink" : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
                  )}
                >
                  {t.featured[m === "gold" ? "metalGold" : "metalSilver"]}
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-1 rounded-full border border-black/15 bg-black/5 p-1 dark:border-white/15 dark:bg-white/5">
              {FORMS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => selectForm(f)}
                  aria-pressed={form === f}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-xs font-bold tracking-wide uppercase transition-colors",
                    form === f ? "bg-gold text-ink" : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
                  )}
                >
                  {t.featured[f === "bar" ? "formBar" : "formCoin"]}
                </button>
              ))}
            </div>
          </div>

          <div className="mx-auto mt-8 grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[1fr_280px] lg:items-start">
            {/* ---------- Catalog grid ---------- */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {metalSkus.map((sku) => {
                const { unitPrice: skuUnitPrice } = skuPricing(sku);
                const isSelected = sku.id === selectedId;
                return (
                  <button
                    key={sku.id}
                    type="button"
                    onClick={() => selectSku(sku.id)}
                    aria-pressed={isSelected}
                    className={cn(
                      "group flex flex-col items-start rounded-md border bg-black/3 p-4 text-left shadow-sm transition-all dark:bg-white/3",
                      isSelected
                        ? "border-gold shadow-[0_10px_24px_-16px_rgba(212,166,42,0.35)]"
                        : "border-black/10 hover:border-gold/40 hover:shadow-md dark:border-white/10 dark:hover:border-white/25"
                    )}
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded-md bg-white dark:bg-black">
                      <div
                        aria-hidden="true"
                        className={cn(
                          "pointer-events-none absolute inset-4 rounded-full bg-[radial-gradient(circle,rgba(244,198,78,0.2)_0%,rgba(212,166,42,0.08)_35%,transparent_70%)] blur-xl transition-opacity duration-300",
                          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-50"
                        )}
                      />
                      <Image
                        src={PRODUCT_IMAGES[sku.metal][sku.form]}
                        alt={skuTitle(sku)}
                        fill
                        sizes="(min-width: 1024px) 18vw, (min-width: 640px) 28vw, 45vw"
                        className="relative object-contain p-4"
                      />
                    </div>
                    <p className="mt-3 text-sm font-bold text-neutral-900 dark:text-white">{skuTitle(sku)}</p>
                    <p className="mt-0.5 text-sm font-semibold text-gold-accent tabular-nums">
                      {skuUnitPrice !== null ? formatBDT(skuUnitPrice) : "—"}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* ---------- Selected product detail panel ---------- */}
            <div className="rounded-md border border-black/10 bg-black/3 p-4 shadow-[0_0_40px_-24px_rgba(244,198,78,0.2)] lg:sticky lg:top-24 dark:border-white/10 dark:bg-white/5">
              <div className="relative aspect-square w-full overflow-hidden rounded-md bg-white dark:bg-black">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-6 rounded-full bg-[radial-gradient(circle,rgba(244,198,78,0.22)_0%,rgba(212,166,42,0.09)_40%,transparent_70%)] blur-2xl"
                />
                <Image src={selectedImage} alt={selectedTitle} fill sizes="280px" className="relative object-contain p-5" />
              </div>

              <p className="mt-3 text-[10px] font-semibold tracking-wide text-gold uppercase">· {t.productsPage.hallmarkBadge}</p>
              <h2 className="mt-1 text-sm font-bold text-neutral-900 dark:text-white">{selectedTitle}</h2>

              <p className="mt-1.5">
                <span className="text-lg font-extrabold text-gold-accent tabular-nums">{totalPrice !== null ? formatBDT(totalPrice) : "—"}</span>
                <span className="ml-1 text-xs text-muted-white">· {t.featured.vatIncluded}</span>
              </p>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-center rounded-full border border-black/15 dark:border-white/15">
                  <button
                    type="button"
                    aria-label={t.featured.decreaseQty}
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="flex size-7 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-black/10 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-6 text-center text-xs font-semibold text-neutral-900 tabular-nums dark:text-white">{qty}</span>
                  <button
                    type="button"
                    aria-label={t.featured.increaseQty}
                    onClick={() => setQty((q) => q + 1)}
                    className="flex size-7 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-black/10 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button size="sm" variant="gold-outline" onClick={handleAddToCart} disabled={unitPrice === null}>
                  {justAdded ? t.featured.added : t.featured.addToCart}
                </Button>
                <Button size="sm" variant="gold-solid" onClick={handleBuyNow} disabled={unitPrice === null}>
                  {t.featured.buyNow}
                </Button>
              </div>

              <ul className="mt-4 flex flex-col gap-1.5 border-t border-black/10 pt-3 dark:border-white/10">
                {[t.productsPage.trustInsured, t.productsPage.trustCertificate, t.productsPage.trustSellBack].map((line) => (
                  <li key={line} className="flex items-start gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-gold" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <LandingFooter />
    </main>
  );
}
