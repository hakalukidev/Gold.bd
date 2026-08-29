"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, Check, Minus, Plus, Store, Trash2, Truck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearCart, removeFromCart, updateQuantity } from "@/store/slices/cart-slice";
import { checkoutSchema, DELIVERY_METHODS, PAYMENT_METHODS, type CheckoutInput, type DeliveryMethod, type PaymentMethod } from "@/lib/validations/checkout";
import { BD_DIVISIONS, districtsOf } from "@/lib/bd-geo";
import { useT } from "@/lib/i18n/use-t";
import { formatBDT } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LandingHeader } from "@/components/landing/landing-header";
import { GoldPriceTicker } from "@/components/landing/gold-price-ticker";
import { LandingFooter } from "@/components/landing/landing-footer";

const inputClass =
  "h-10 w-full rounded-md border border-white/15 bg-ink px-3 text-sm text-white outline-none focus:border-gold/60 disabled:cursor-not-allowed disabled:opacity-50";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-white/10 bg-white/5 p-5 sm:p-6">
      <h2 className="text-base font-bold text-white">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-xs text-neutral-400">
      {children}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-400">{message}</p>;
}

function OptionCard({
  selected,
  onClick,
  icon: Icon,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex flex-col items-start gap-2 rounded-md border p-4 text-left transition-colors",
        selected ? "border-gold bg-gold/5" : "border-white/10 hover:border-white/25"
      )}
    >
      <div className="flex w-full items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-bold text-white">
          <Icon className="size-4 text-gold" />
          {title}
        </span>
        <span
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded-full border-2",
            selected ? "border-gold" : "border-white/30"
          )}
        >
          {selected && <span className="size-2 rounded-full bg-gold" />}
        </span>
      </div>
      <p className="text-xs text-neutral-400">{description}</p>
    </button>
  );
}

/** Payment-method badges — real logos where we have one (bKash's official
 *  mark, plus Visa/Mastercard/Nagad recreations), a generic wallet icon for
 *  "other" since that option isn't tied to one brand. */
function PaymentLogo({ method }: { method: PaymentMethod }) {
  if (method === "bkash") return <Image src="/payment-logos/bkash.svg" alt="bKash" width={48} height={32} className="h-6 w-auto" />;
  if (method === "nagad") return <Image src="/payment-logos/nagad.svg" alt="Nagad" width={48} height={32} className="h-6 w-auto" />;
  if (method === "card")
    return (
      <span className="flex items-center gap-1.5">
        <Image src="/payment-logos/visa.svg" alt="Visa" width={40} height={24} className="h-5 w-auto" />
        <Image src="/payment-logos/mastercard.svg" alt="Mastercard" width={28} height={17} className="h-5 w-auto" />
      </span>
    );
  return <Wallet className="size-4 text-gold" />;
}

export default function CheckoutPage() {
  const t = useT();
  const c = t.checkoutPage;
  const router = useRouter();
  const dispatch = useAppDispatch();
  const items = useAppSelector((state) => state.cart.items);

  const [promoCode, setPromoCode] = useState("");
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);

  const form = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      deliveryMethod: "home",
      paymentMethod: "bkash",
      recipientName: "",
      recipientEmail: "",
      recipientPhone: "",
      address: "",
      division: "",
      district: "",
      note: "",
    },
  });

  const deliveryMethod = form.watch("deliveryMethod");
  const paymentMethod = form.watch("paymentMethod");
  const division = form.watch("division");

  // Changing division invalidates whatever district was picked under the old one.
  useEffect(() => {
    form.setValue("district", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [division]);

  const subtotal = items.reduce((sum, item) => sum + item.unitPriceBDT * item.quantity, 0);
  // No live courier-pricing feed in this repo — insured delivery is quoted
  // flat (currently free) for both methods rather than invented per-zone rates.
  const deliveryCharge = 0;
  const total = subtotal + deliveryCharge;

  function applyPromo() {
    if (!promoCode.trim()) return;
    toast.info(c.promoComingSoon);
  }

  function onSubmit() {
    // There's no payment gateway or orders API in this repo (see CLAUDE.md) —
    // record the request locally, the same way the "instabuy" reference site
    // hands an order to human follow-up for payment confirmation.
    const orderId = `GB-${Date.now().toString(36).toUpperCase()}`;
    setPlacedOrderId(orderId);
    dispatch(clearCart());
    toast.success(c.successTitle);
  }

  if (placedOrderId) {
    return (
      <main className="flex flex-1 flex-col">
        <GoldPriceTicker />
        <LandingHeader />
        <div className="flex flex-1 items-center justify-center bg-ink px-4 py-24">
          <div className="w-full max-w-md rounded-md border border-white/10 bg-white/5 p-8 text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-gold/15 text-gold">
              <Check className="size-7" />
            </span>
            <h1 className="mt-4 text-xl font-bold text-white">{c.successTitle}</h1>
            <p className="mt-2 text-sm text-neutral-400">{c.successDescription}</p>
            <p className="mt-4 text-xs text-neutral-500">
              {c.successOrderNo}: <span className="font-mono text-neutral-300">{placedOrderId}</span>
            </p>
            <Button variant="gold-solid" className="mt-6 w-full" nativeButton={false} render={<Link href="/products/gold">{c.continueShopping}</Link>} />
          </div>
        </div>
        <LandingFooter />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <GoldPriceTicker />
      <LandingHeader />

      <div className="bg-ink py-10 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Back"
              className="flex size-9 items-center justify-center rounded-full text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="size-5" />
            </button>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">{c.heading}</h1>
          </div>

          {items.length === 0 ? (
            <div className="mx-auto mt-10 max-w-md rounded-md border border-white/10 bg-white/5 p-8 text-center">
              <h2 className="text-lg font-bold text-white">{c.emptyTitle}</h2>
              <p className="mt-2 text-sm text-neutral-400">{c.emptyDescription}</p>
              <Button variant="gold-solid" className="mt-6 w-full" nativeButton={false} render={<Link href="/products/gold">{c.emptyCta}</Link>} />
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
              {/* ---------- Left: delivery & recipient details ---------- */}
              <div className="flex flex-col gap-6">
                <Section title={c.deliveryHeading}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {DELIVERY_METHODS.map((method: DeliveryMethod) => (
                      <OptionCard
                        key={method}
                        selected={deliveryMethod === method}
                        onClick={() => form.setValue("deliveryMethod", method, { shouldValidate: true })}
                        icon={method === "home" ? Truck : Store}
                        title={method === "home" ? c.homeTitle : c.pickupTitle}
                        description={method === "home" ? c.homeDescription : c.pickupDescription}
                      />
                    ))}
                  </div>
                </Section>

                <Section title={c.recipientHeading}>
                  <div className="grid gap-4">
                    <div>
                      <FieldLabel htmlFor="recipientName">{c.recipientNameLabel}</FieldLabel>
                      <input id="recipientName" placeholder={c.namePlaceholder} className={inputClass} {...form.register("recipientName")} />
                      <FieldError message={form.formState.errors.recipientName?.message} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <FieldLabel htmlFor="recipientEmail">{c.recipientEmailLabel}</FieldLabel>
                        <input id="recipientEmail" type="email" placeholder={c.emailPlaceholder} className={inputClass} {...form.register("recipientEmail")} />
                        <FieldError message={form.formState.errors.recipientEmail?.message} />
                      </div>
                      <div>
                        <FieldLabel htmlFor="recipientPhone">{c.recipientPhoneLabel}</FieldLabel>
                        <input id="recipientPhone" placeholder="01XXXXXXXXX" className={inputClass} {...form.register("recipientPhone")} />
                        <FieldError message={form.formState.errors.recipientPhone?.message} />
                      </div>
                    </div>

                    {deliveryMethod === "home" && (
                      <>
                        <div>
                          <FieldLabel htmlFor="address">{c.addressLabel}</FieldLabel>
                          <input id="address" placeholder={c.addressPlaceholder} className={inputClass} {...form.register("address")} />
                          <FieldError message={form.formState.errors.address?.message} />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <FieldLabel htmlFor="division">{c.divisionLabel}</FieldLabel>
                            <select id="division" className={inputClass} {...form.register("division")}>
                              <option value="">{c.selectDivision}</option>
                              {BD_DIVISIONS.map((d) => (
                                <option key={d.name} value={d.name}>
                                  {d.name}
                                </option>
                              ))}
                            </select>
                            <FieldError message={form.formState.errors.division?.message} />
                          </div>
                          <div>
                            <FieldLabel htmlFor="district">{c.districtLabel}</FieldLabel>
                            <select id="district" disabled={!division} className={inputClass} {...form.register("district")}>
                              <option value="">{c.selectDistrict}</option>
                              {districtsOf(division ?? "").map((name) => (
                                <option key={name} value={name}>
                                  {name}
                                </option>
                              ))}
                            </select>
                            <FieldError message={form.formState.errors.district?.message} />
                          </div>
                        </div>
                      </>
                    )}

                    <div>
                      <FieldLabel htmlFor="note">{c.noteLabel}</FieldLabel>
                      <textarea
                        id="note"
                        rows={3}
                        placeholder={c.notePlaceholder}
                        className="w-full rounded-md border border-white/15 bg-ink px-3 py-2 text-sm text-white outline-none focus:border-gold/60"
                        {...form.register("note")}
                      />
                    </div>
                  </div>
                </Section>
              </div>

              {/* ---------- Right: order summary + payment ---------- */}
              <div className="rounded-md border border-white/10 bg-white/5 p-5 lg:sticky lg:top-24">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-white">{c.orderHeading}</h2>
                  <Link href="/products/gold" className="flex items-center gap-1 text-xs font-semibold text-gold hover:text-gold-light">
                    <Plus className="size-3.5" />
                    {c.addMore}
                  </Link>
                </div>

                <div className="mt-4 flex flex-col gap-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-black">
                        <Image src={item.image} alt={item.name} width={56} height={56} className="size-full object-contain p-1.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-white">{item.name}</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <button
                            type="button"
                            aria-label={t.featured.decreaseQty}
                            onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity - 1 }))}
                            className="flex size-5 items-center justify-center rounded-full border border-white/15 text-neutral-300 hover:bg-white/10 hover:text-white"
                          >
                            <Minus className="size-3" />
                          </button>
                          <span className="w-4 text-center text-[11px] font-semibold text-white tabular-nums">{item.quantity}</span>
                          <button
                            type="button"
                            aria-label={t.featured.increaseQty}
                            onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity + 1 }))}
                            className="flex size-5 items-center justify-center rounded-full border border-white/15 text-neutral-300 hover:bg-white/10 hover:text-white"
                          >
                            <Plus className="size-3" />
                          </button>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className="text-xs font-bold text-gold tabular-nums">{formatBDT(item.unitPriceBDT * item.quantity)}</span>
                        <button
                          type="button"
                          aria-label={t.nav.cartRemove}
                          onClick={() => dispatch(removeFromCart(item.id))}
                          className="text-neutral-500 hover:text-red-400"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-4">
                  <input
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder={c.promoPlaceholder}
                    className="h-8 flex-1 rounded-md border border-white/15 bg-ink px-2.5 text-xs text-white outline-none focus:border-gold/60"
                  />
                  <button
                    type="button"
                    onClick={applyPromo}
                    className="h-8 shrink-0 rounded-md border border-gold/40 px-2.5 text-xs font-semibold text-gold hover:bg-gold/10"
                  >
                    {c.promoApply}
                  </button>
                </div>

                <div className="mt-4 flex flex-col gap-1.5 border-t border-white/10 pt-4 text-sm">
                  <div className="flex items-center justify-between text-neutral-300">
                    <span>{c.subtotal}</span>
                    <span className="tabular-nums">{formatBDT(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-neutral-300">
                    <span>{c.deliveryCharge}</span>
                    <span className="tabular-nums">{formatBDT(deliveryCharge)}</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                  <span className="text-sm font-semibold text-white">{c.total}</span>
                  <span className="text-lg font-extrabold text-gold tabular-nums">{formatBDT(total)}</span>
                </div>

                <div className="mt-5 border-t border-white/10 pt-4">
                  <p className="text-xs font-semibold text-neutral-300">{c.paymentHeading}</p>
                  <div className="mt-3 flex flex-col gap-2">
                    {PAYMENT_METHODS.map((method: PaymentMethod) => {
                      const label =
                        method === "bkash" ? c.paymentBkash : method === "nagad" ? c.paymentNagad : method === "card" ? c.paymentCard : c.paymentOther;
                      const selected = paymentMethod === method;
                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() => form.setValue("paymentMethod", method, { shouldValidate: true })}
                          aria-pressed={selected}
                          className={cn(
                            "flex items-center justify-between gap-2 rounded-md border px-3 py-2.5 text-left transition-colors",
                            selected ? "border-gold bg-gold/5" : "border-white/10 hover:border-white/25"
                          )}
                        >
                          <span className="flex items-center gap-2.5 text-sm font-semibold text-white">
                            <PaymentLogo method={method} />
                            {label}
                          </span>
                          <span
                            className={cn(
                              "flex size-4 shrink-0 items-center justify-center rounded-full border-2",
                              selected ? "border-gold" : "border-white/30"
                            )}
                          >
                            {selected && <span className="size-2 rounded-full bg-gold" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Button type="submit" variant="gold-solid" className="mt-5 w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? c.placingOrder : c.placeOrder}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      <LandingFooter />
    </main>
  );
}
