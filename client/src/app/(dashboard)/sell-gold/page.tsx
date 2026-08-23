import { PageHeader } from "@/components/shared/page-header";
import { SellGoldPanel } from "@/components/forms/sell-gold-panel";
import { WalletBadge } from "@/components/shared/wallet-badge";

export default function SellGoldPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Sell your gold" description="Cash out anytime, 24/7" action={<WalletBadge />} />
      <SellGoldPanel />
    </div>
  );
}
