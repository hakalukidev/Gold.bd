import { PageHeader } from "@/components/shared/page-header";
import { WalletBadge } from "@/components/shared/wallet-badge";
import { AutoSavePanel } from "@/components/forms/auto-save-panel";

export default function AutoSavePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Auto-Save plans" description="Build gold savings automatically" action={<WalletBadge />} />
      <AutoSavePanel />
    </div>
  );
}
