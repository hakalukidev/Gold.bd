import { PageHeader } from "@/components/shared/page-header";
import { WalletBadge } from "@/components/shared/wallet-badge";
import { CollectPanel } from "@/components/forms/collect-panel";

export default function CollectPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Collect physical gold" description="Insured delivery, bars and coins" action={<WalletBadge />} />
      <CollectPanel />
    </div>
  );
}
