"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";
import { useWallet } from "@/hooks/use-wallet";
import { useGoldRate } from "@/hooks/use-gold-rate";
import { formatBDT } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

// Illustrative SKU-level breakdown — the real wallet only tracks one flat
// goldBalanceGrams total (see types/index.ts), not per-bar/coin serials, so
// this split is a stand-in for what a real vault ledger would show rather
// than actual inventory records.
const HOLDINGS_BREAKDOWN = [
  { sku: "Gold Bar · 22K", serial: "GK-BR-88213", grams: 2 },
  { sku: "Gold Coin · 22K", serial: "GK-CN-40952", grams: 0.42 },
  { sku: "Gold Coin · 21K", serial: "GK-CN-40988", grams: 0.6 },
  { sku: "Gold Bar · 18K", serial: "GK-BR-90441", grams: 0.4 },
] as const;

const FREE_STORAGE_ALLOWANCE_G = 5;
const STORAGE_FEE_RATE_PER_YEAR = 0.005;

export function VaultPanel() {
  const { data: wallet } = useWallet();
  const { data: rate } = useGoldRate();

  const balanceGrams = wallet ? Number(wallet.goldBalanceGrams) : null;
  const pricePerGram = rate ? Number(rate.pricePerGramBDT) : null;
  const insuredValue = balanceGrams !== null && pricePerGram !== null ? balanceGrams * pricePerGram : null;
  const withinFreeTier = balanceGrams === null || balanceGrams <= FREE_STORAGE_ALLOWANCE_G;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent>
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Storage partner</p>
            <p className="mt-1 text-lg font-semibold">Securex Pvt. Ltd.</p>
            <p className="mt-1 text-sm text-muted-foreground">Bank-grade vault facilities with 24/7 physical security and biometric access control.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Insurance partner</p>
            <p className="mt-1 text-lg font-semibold">Green Delta Insurance</p>
            <p className="mt-1 text-sm text-muted-foreground">Your full holdings are insured against theft, loss, and damage at all times.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold">Vaulted holdings breakdown</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => toast.info("Coming soon — certificate downloads aren't wired up yet.")}
            >
              <Download className="size-3.5" />
              Download certificate
            </Button>
          </div>
          <div className="divide-y">
            {HOLDINGS_BREAKDOWN.map((h) => (
              <div key={h.serial} className="flex items-center justify-between py-3 text-sm">
                <span className="font-medium">{h.sku}</span>
                <span className="text-muted-foreground">{h.serial}</span>
                <span className="font-medium tabular-nums">{h.grams}g</span>
              </div>
            ))}
          </div>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Insured value</p>
              <p className="font-medium">{insuredValue !== null ? formatBDT(insuredValue) : "…"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Compliance</p>
              <p className="font-medium">BAJUS · ECAB · BASIS member</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Regulatory ID</p>
              <p className="font-medium">DBID approved, Ministry of Commerce</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <p className="font-semibold">Storage &amp; fees</p>
          <Row label="Free storage allowance" value={`Up to ${FREE_STORAGE_ALLOWANCE_G} g`} />
          <Row label="Fee above allowance" value={`${STORAGE_FEE_RATE_PER_YEAR * 100}% / year of holding value, accrued daily`} />
          <Row label="Charged" value="Auto-deducted in gold grams, on the 1st of each month" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Your status</span>
            {balanceGrams !== null ? (
              <Badge className={withinFreeTier ? "bg-emerald-500/15 text-emerald-500" : undefined} variant={withinFreeTier ? undefined : "secondary"}>
                {withinFreeTier
                  ? `Within free tier — no fee (${balanceGrams.toFixed(2)}g of ${FREE_STORAGE_ALLOWANCE_G}g)`
                  : `Fee applies — ${balanceGrams.toFixed(2)}g stored`}
              </Badge>
            ) : (
              <span>…</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
