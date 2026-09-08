"use client";

import { PageHeader } from "@/components/shared/page-header";
import { WalletBadge } from "@/components/shared/wallet-badge";
import { LoanPanel } from "@/components/forms/loan-panel";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function LoanAgainstGoldPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pages.loanAgainstGold.title")}
        description={t("pages.loanAgainstGold.description")}
        action={<WalletBadge />}
      />
      <LoanPanel />
    </div>
  );
}
