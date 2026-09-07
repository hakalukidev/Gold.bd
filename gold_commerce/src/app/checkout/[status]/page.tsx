"use client";

import { Suspense, use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppDispatch } from "@/store/hooks";
import { clearCart } from "@/store/slices/cart-slice";
import { useT } from "@/lib/i18n/use-t";
import { api, ApiError } from "@/lib/api-client";
import type { PaymentStatusResponse } from "@/types";
import { LandingHeader } from "@/components/landing/landing-header";
import { GoldPriceTicker } from "@/components/landing/gold-price-ticker";
import { LandingFooter } from "@/components/landing/landing-footer";

/**
 * SSLCommerz lands the shopper back here after the hosted checkout page
 * resolves — wallet_server's payments module already 302'd them to
 * /checkout/success|fail|cancel?tran_id=... (see checkout/page.tsx's
 * returnBaseUrl). This page doesn't trust that path segment on its own: it
 * re-fetches the transaction's real status from wallet_server before showing
 * anything or clearing the cart, since a shopper could hand-edit the URL.
 */
export default function CheckoutStatusPage({ params }: { params: Promise<{ status: string }> }) {
  const { status: routeStatus } = use(params);
  return (
    <Suspense fallback={<StatusShell body={<VerifyingBody />} />}>
      <CheckoutStatusContent routeStatus={routeStatus} />
    </Suspense>
  );
}

function VerifyingBody() {
  const t = useT();
  return (
    <>
      <Loader2 className="mx-auto size-8 animate-spin text-gold" />
      <p className="mt-4 text-sm text-neutral-400">{t.checkoutPage.verifyingPayment}</p>
    </>
  );
}

function ErrorBody({ message, title }: { message: string; title: string }) {
  return (
    <>
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-500/15 text-red-400">
        <AlertTriangle className="size-7" />
      </span>
      <h1 className="mt-4 text-xl font-bold text-white">{title}</h1>
      <p className="mt-2 text-sm text-neutral-400">{message}</p>
    </>
  );
}

function StatusShell({ body }: { body: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col">
      <GoldPriceTicker />
      <LandingHeader />
      <div className="flex flex-1 items-center justify-center bg-ink px-4 py-24">
        <div className="w-full max-w-md rounded-md border border-white/10 bg-white/5 p-8 text-center">{body}</div>
      </div>
      <LandingFooter />
    </main>
  );
}

function CheckoutStatusContent({ routeStatus }: { routeStatus: string }) {
  const searchParams = useSearchParams();
  const tranId = searchParams.get("tran_id");
  const dispatch = useAppDispatch();
  const t = useT();
  const c = t.checkoutPage;

  const [payment, setPayment] = useState<PaymentStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tranId) return;
    let cancelled = false;
    api
      .get<PaymentStatusResponse>(`/api/payments/${encodeURIComponent(tranId)}`)
      .then((data) => {
        if (cancelled) return;
        setPayment(data);
        if (data.status === "VALID") dispatch(clearCart());
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Could not verify this payment");
      });
    return () => {
      cancelled = true;
    };
  }, [tranId, dispatch]);

  if (!tranId) return <StatusShell body={<ErrorBody message="Missing transaction reference" title={c.failTitle} />} />;
  if (!payment && !error) return <StatusShell body={<VerifyingBody />} />;

  const orderId = typeof payment?.metadata.orderId === "string" ? payment.metadata.orderId : null;
  const resolved = payment?.status === "VALID" ? "success" : payment?.status === "FAILED" ? "fail" : payment?.status === "CANCELLED" ? "cancel" : null;
  // Show the gateway's own answer once we have it; the URL segment is only a
  // same-page hint used while that fetch is still in flight.
  const display = resolved ?? (routeStatus === "success" ? "success" : routeStatus === "cancel" ? "cancel" : "fail");

  return (
    <StatusShell
      body={
        <>
          <span
            className={`mx-auto flex size-14 items-center justify-center rounded-full ${
              display === "success" ? "bg-gold/15 text-gold" : display === "cancel" ? "bg-white/10 text-neutral-300" : "bg-red-500/15 text-red-400"
            }`}
          >
            {display === "success" ? <Check className="size-7" /> : display === "cancel" ? <X className="size-7" /> : <AlertTriangle className="size-7" />}
          </span>
          <h1 className="mt-4 text-xl font-bold text-white">
            {error ? c.failTitle : display === "success" ? c.successTitle : display === "cancel" ? c.cancelTitle : c.failTitle}
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            {error ?? (display === "success" ? c.successDescription : display === "cancel" ? c.cancelDescription : c.failDescription)}
          </p>
          {display === "success" && orderId && (
            <p className="mt-4 text-xs text-neutral-500">
              {c.successOrderNo}: <span className="font-mono text-neutral-300">{orderId}</span>
            </p>
          )}
          {display === "success" ? (
            <Button variant="gold-solid" className="mt-6 w-full" nativeButton={false} render={<Link href="/products/gold">{c.continueShopping}</Link>} />
          ) : (
            <Button variant="gold-solid" className="mt-6 w-full" nativeButton={false} render={<Link href="/checkout">{c.backToCheckout}</Link>} />
          )}
        </>
      }
    />
  );
}
