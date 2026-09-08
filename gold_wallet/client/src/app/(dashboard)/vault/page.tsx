"use client";

import { PageHeader } from "@/components/shared/page-header";
import { WalletBadge } from "@/components/shared/wallet-badge";
import { VaultPanel } from "@/components/forms/vault-panel";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function VaultPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <PageHeader title={t("vault.header.title")} description={t("vault.header.description")} action={<WalletBadge />} />
      <VaultPanel />
    </div>
  );
}
