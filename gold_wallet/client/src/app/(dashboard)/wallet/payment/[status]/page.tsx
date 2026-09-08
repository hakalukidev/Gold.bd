"use client";

import { Suspense, use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { walletPaymentsApi, ApiError } from "@/lib/wallet-payments-api";
import { formatBDT } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { PaymentStatusResponse } from "@/types";

/**
 * SSLCommerz lands the shopper back here once the hosted checkout page
 * resolves — wallet_server's payments module already validated the
 * transaction and 302'd them to /wallet/payment/success|fail|cancel?tran_id=...
 * (see add-money-panel.tsx's returnBaseUrl). This page re-fetches the real
 * status rather than trusting the path segment, since it's just a same-page
 * hint a shopper could hand-edit.
 *
 * Crediting the wallet's cash balance for a VALID deposit happens server-side
 * (payment.service.js's confirmTransaction, atomically with the status flip)
 * the moment SSLCommerz's IPN or this redirect first confirms it — this page
 * only re-fetches and reports what already settled, it doesn't do the
 * crediting itself.
 */
export default function WalletPaymentStatusPage({ params }: { params: Promise<{ status: string }> }) {
  const { status: routeStatus } = use(params);
  return (
    <Suspense fallback={<StatusCard body={<VerifyingBody />} />}>
      <PaymentStatusContent routeStatus={routeStatus} />
    </Suspense>
  );
}

function VerifyingBody() {
  const { t } = useTranslation();
  return (
    <>
      <Spinner className="mx-auto size-8 text-gold" />
      <p className="mt-4 text-sm text-muted-foreground">{t("paymentStatus.verifying")}</p>
    </>
  );
}

function StatusCard({ body }: { body: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">{body}</CardContent>
      </Card>
    </div>
  );
}

function PaymentStatusContent({ routeStatus }: { routeStatus: string }) {
  const searchParams = useSearchParams();
  const tranId = searchParams.get("tran_id");
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [payment, setPayment] = useState<PaymentStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tranId) return;
    let cancelled = false;
    walletPaymentsApi
      .getStatus(tranId)
      .then((data) => {
        if (cancelled) return;
        setPayment(data);
        // The credit already landed server-side (see confirmTransaction) —
        // this just makes sure the wallet page doesn't show a pre-deposit
        // balance for up to its 15s staleTime after landing here.
        if (data.status === "VALID") queryClient.invalidateQueries({ queryKey: ["wallet"] });
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : t("paymentStatus.couldNotVerify"));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` is stable enough per render; adding it would re-fire the fetch every render
  }, [tranId, queryClient]);

  if (!tranId) {
    return (
      <StatusCard
        body={
          <>
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <AlertTriangle className="size-7" />
            </span>
            <h1 className="mt-4 text-xl font-bold">{t("paymentStatus.failed")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("paymentStatus.missingReference")}</p>
          </>
        }
      />
    );
  }
  if (!payment && !error) return <StatusCard body={<VerifyingBody />} />;

  const resolved = payment?.status === "VALID" ? "success" : payment?.status === "FAILED" ? "fail" : payment?.status === "CANCELLED" ? "cancel" : null;
  const display = resolved ?? (routeStatus === "success" ? "success" : routeStatus === "cancel" ? "cancel" : "fail");

  return (
    <StatusCard
      body={
        <>
          <span
            className={`mx-auto flex size-14 items-center justify-center rounded-full ${
              display === "success" ? "bg-gold/15 text-gold" : display === "cancel" ? "bg-muted text-muted-foreground" : "bg-destructive/15 text-destructive"
            }`}
          >
            {display === "success" ? <Check className="size-7" /> : display === "cancel" ? <X className="size-7" /> : <AlertTriangle className="size-7" />}
          </span>
          <h1 className="mt-4 text-xl font-bold">
            {error
              ? t("paymentStatus.failed")
              : display === "success"
                ? t("paymentStatus.successful")
                : display === "cancel"
                  ? t("paymentStatus.cancelled")
                  : t("paymentStatus.failed")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error ??
              (display === "success"
                ? t("paymentStatus.successBody")
                : display === "cancel"
                  ? t("paymentStatus.cancelBody")
                  : t("paymentStatus.failBody"))}
          </p>
          {payment && (
            <p className="mt-4 text-xs text-muted-foreground">
              {formatBDT(payment.amountBDT)} · <span className="font-mono">{payment.tranId}</span>
            </p>
          )}
          <Button
            variant="gold-solid"
            className="mt-6 w-full"
            nativeButton={false}
            render={<Link href="/wallet">{t("paymentStatus.backToWallet")}</Link>}
          />
        </>
      }
    />
  );
}
