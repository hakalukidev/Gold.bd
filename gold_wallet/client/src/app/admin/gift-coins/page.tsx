"use client";

import { toast } from "sonner";
import { Gift, TriangleAlert } from "lucide-react";
import { useGiftCoinQueue, useFulfillGiftCoin } from "@/hooks/use-gift-coin";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SecureImage } from "@/components/shared/secure-image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";
import { ApiError } from "@/lib/api-client";
import { giftCoinPhotoUrl } from "@/lib/gift-coin-api";
import { useTranslation } from "@/lib/i18n/use-translation";

function maskPhone(phone: string) {
  return phone.length > 4 ? `${phone.slice(0, -4).replace(/./g, "•")}${phone.slice(-4)}` : phone;
}

/** Queue of "print my photo on the coin" gift add-ons — this app has no
 * minting/shipping automation, so an admin fulfills these by hand and marks
 * each one sent once the physical coin has actually gone out. */
export default function AdminGiftCoinsPage() {
  const { t } = useTranslation();
  const { data: queue, isLoading, isError } = useGiftCoinQueue("PENDING");
  const fulfill = useFulfillGiftCoin();

  function handleFulfill(id: string) {
    fulfill.mutate(id, {
      onSuccess: () => toast.success(t("admin.giftCoins.fulfilled")),
      onError: (error) => toast.error(error instanceof ApiError ? error.message : t("admin.giftCoins.actionFailed")),
    });
  }

  return (
    <>
      <PageHeader title={t("admin.giftCoins.title")} description={t("adminNav.giftCoins")} />
      <Card>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
            </div>
          ) : isError ? (
            <EmptyState icon={TriangleAlert} title={t("admin.giftCoins.loadErrorTitle")} description={t("admin.giftCoins.loadErrorDescription")} />
          ) : !queue || queue.length === 0 ? (
            <EmptyState icon={Gift} title={t("admin.giftCoins.emptyTitle")} description={t("admin.giftCoins.emptyDescription")} />
          ) : (
            <div className="space-y-3">
              {queue.map((order) => (
                <div key={order.id} className="flex flex-wrap items-center gap-4 rounded-md border p-3">
                  <SecureImage url={giftCoinPhotoUrl(order.id)} alt={t("admin.giftCoins.photoAlt")} className="size-16 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {order.senderName} → {order.recipientName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.senderPhone ? maskPhone(order.senderPhone) : "—"} → {order.recipientPhone ? maskPhone(order.recipientPhone) : "—"}
                      {order.occasion ? ` · ${order.occasion}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
                  </div>
                  <Button variant="gold-solid" size="sm" disabled={fulfill.isPending} onClick={() => handleFulfill(order.id)}>
                    {t("admin.giftCoins.markSent")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
