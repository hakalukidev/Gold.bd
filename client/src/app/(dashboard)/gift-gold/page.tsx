import { PageHeader } from "@/components/shared/page-header";
import { WalletBadge } from "@/components/shared/wallet-badge";
import { GiftGoldPanel } from "@/components/forms/gift-gold-panel";

export default function GiftGoldPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Gift gold" description="Send certified gold to loved ones" action={<WalletBadge />} />
      <GiftGoldPanel />
    </div>
  );
}
