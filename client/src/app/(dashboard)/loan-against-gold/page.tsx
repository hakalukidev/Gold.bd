import { PageHeader } from "@/components/shared/page-header";
import { WalletBadge } from "@/components/shared/wallet-badge";
import { LoanPanel } from "@/components/forms/loan-panel";

export default function LoanAgainstGoldPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Loan against gold" description="Borrow cash using your vaulted gold as collateral" action={<WalletBadge />} />
      <LoanPanel />
    </div>
  );
}
