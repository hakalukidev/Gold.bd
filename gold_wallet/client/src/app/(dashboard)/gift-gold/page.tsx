"use client";

import { PageHeader } from "@/components/shared/page-header";
import { WalletBadge } from "@/components/shared/wallet-badge";
import { GiftGoldPanel } from "@/components/forms/gift-gold-panel";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function GiftGoldPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <PageHeader title={t("pages.giftGold.title")} description={t("pages.giftGold.description")} action={<WalletBadge />} />
      <GiftGoldPanel />
    </div>
  );
}
