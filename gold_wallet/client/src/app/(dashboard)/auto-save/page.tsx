"use client";

import { PageHeader } from "@/components/shared/page-header";
import { WalletBadge } from "@/components/shared/wallet-badge";
import { AutoSavePanel } from "@/components/forms/auto-save-panel";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function AutoSavePage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <PageHeader title={t("pages.autoSave.title")} description={t("pages.autoSave.description")} action={<WalletBadge />} />
      <AutoSavePanel />
    </div>
  );
}
