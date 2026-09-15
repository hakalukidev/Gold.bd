"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Check, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/use-t";
import { api, ApiError } from "@/lib/api-client";
import type { ManualPaymentStatusResponse } from "@/types";
import { LandingHeader } from "@/components/landing/landing-header";
import { GoldPriceTicker } from "@/components/landing/gold-price-ticker";
import { LandingFooter } from "@/components/landing/landing-footer";

/** Lands here right after a shopper submits a bKash/Nagad/bank-transfer
 * manual payment (see checkout/page.tsx's onSuccess handler) — the order is
 * placed but not yet confirmed; an admin reviews it from /admin/payments.
 * Polls its own status so a shopper who keeps the tab open sees the outcome
 * without refreshing. */
export default function CheckoutPendingPage() {
  return (
    <Suspense fallback={<StatusShell body={<VerifyingBody />} />}>
      <PendingContent />
    </Suspense>
  );
}

function VerifyingBody() {
  const t = useT();
  return (
    <>
      <Loader2 className="mx-auto size-8 animate-spin text-gold" />
      <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">{t.checkoutPage.verifyingPayment}</p>
    </>
  );
}

function StatusShell({ body }: { body: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col">
      <GoldPriceTicker />
      <LandingHeader />
      <div className="flex flex-1 items-center justify-center bg-background px-4 py-24">
        <div className="w-full max-w-md rounded-md border border-black/10 bg-black/5 p-8 text-center dark:border-white/10 dark:bg-white/5">{body}</div>
      </div>
      <LandingFooter />
    </main>
  );
}

const POLL_INTERVAL_MS = 10_000;

function PendingContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");
  const t = useT();
  const c = t.checkoutPage;

  const [payment, setPayment] = useState<ManualPaymentStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ref) return;
    let cancelled = false;

    async function poll() {
      try {
        const data = await api.get<ManualPaymentStatusResponse>(`/api/manual-payments/${encodeURIComponent(ref!)}`);
        if (!cancelled) setPayment(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Could not check this payment's status");
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [ref]);

  if (!ref) return <StatusShell body={<ErrorBody message="Missing payment reference" />} />;
  if (!payment && !error) return <StatusShell body={<VerifyingBody />} />;

  if (error) return <StatusShell body={<ErrorBody message={error} />} />;

  const status = payment!.status;

  return (
    <StatusShell
      body={
        <>
          <span
            className={`mx-auto flex size-14 items-center justify-center rounded-full ${
              status === "APPROVED"
                ? "bg-gold/15 text-gold"
                : status === "DECLINED"
                  ? "bg-red-500/15 text-red-600 dark:text-red-400"
                  : "bg-black/10 text-neutral-600 dark:bg-white/10 dark:text-neutral-300"
            }`}
          >
            {status === "APPROVED" ? <Check className="size-7" /> : status === "DECLINED" ? <AlertTriangle className="size-7" /> : <Clock className="size-7" />}
          </span>
          <h1 className="mt-4 text-xl font-bold text-neutral-900 dark:text-white">
            {status === "APPROVED" ? c.pendingApprovedTitle : status === "DECLINED" ? c.pendingDeclinedTitle : c.pendingHeading}
          </h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            {status === "APPROVED"
              ? c.pendingApprovedDescription
              : status === "DECLINED"
                ? (payment!.declineReason ? `${c.pendingDeclinedDescription} (${payment!.declineReason})` : c.pendingDeclinedDescription)
                : c.pendingDescription}
          </p>
          <p className="mt-4 text-xs text-neutral-500">
            {c.pendingOrderNo}: <span className="font-mono text-neutral-700 dark:text-neutral-300">{payment!.orderId}</span>
          </p>
          {status === "APPROVED" ? (
            <Button variant="gold-solid" className="mt-6 w-full" nativeButton={false} render={<Link href="/products/gold">{c.continueShopping}</Link>} />
          ) : (
            <Button variant="gold-solid" className="mt-6 w-full" nativeButton={false} render={<Link href="/">{c.continueShopping}</Link>} />
          )}
        </>
      }
    />
  );
}

function ErrorBody({ message }: { message: string }) {
  return (
    <>
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-500/15 text-red-600 dark:text-red-400">
        <AlertTriangle className="size-7" />
      </span>
      <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">{message}</p>
    </>
  );
}
