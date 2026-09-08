"use client";

import { PageHeader } from "@/components/shared/page-header";
import { WalletBadge } from "@/components/shared/wallet-badge";
import { CollectPanel } from "@/components/forms/collect-panel";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function CollectPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <PageHeader title={t("pages.collect.title")} description={t("pages.collect.description")} action={<WalletBadge />} />
      <CollectPanel />
    </div>
  );
}
