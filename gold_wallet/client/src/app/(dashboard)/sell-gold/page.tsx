"use client";

import { PageHeader } from "@/components/shared/page-header";
import { SellGoldPanel } from "@/components/forms/sell-gold-panel";
import { WalletBadge } from "@/components/shared/wallet-badge";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function SellGoldPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <PageHeader title={t("pages.sellGold.title")} description={t("pages.sellGold.description")} action={<WalletBadge />} />
      <SellGoldPanel />
    </div>
  );
}
