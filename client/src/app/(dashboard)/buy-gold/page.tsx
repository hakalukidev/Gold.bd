import { PageHeader } from "@/components/shared/page-header";
import { BuyGoldPanel } from "@/components/forms/buy-gold-panel";
import { WalletBadge } from "@/components/shared/wallet-badge";

export default function BuyGoldPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Buy 22K gold" description="Start from as low as ৳500" action={<WalletBadge />} />
      <BuyGoldPanel />
    </div>
  );
}
