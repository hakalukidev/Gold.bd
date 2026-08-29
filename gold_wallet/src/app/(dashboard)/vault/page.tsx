import { PageHeader } from "@/components/shared/page-header";
import { WalletBadge } from "@/components/shared/wallet-badge";
import { VaultPanel } from "@/components/forms/vault-panel";

export default function VaultPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Vault & storage" description="Where your gold is kept, insured" action={<WalletBadge />} />
      <VaultPanel />
    </div>
  );
}
