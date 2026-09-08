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
import { useTranslation } from "@/lib/i18n/use-translation";

// Illustrative SKU-level breakdown — the real wallet only tracks one flat
// goldBalanceGrams total (see types/index.ts), not per-bar/coin serials, so
// this split is a stand-in for what a real vault ledger would show rather
// than actual inventory records.
const HOLDINGS_BREAKDOWN = [
  { skuKey: "vaultPanel.holdingsBreakdown.skus.goldBar22k", serial: "GK-BR-88213", grams: 2 },
  { skuKey: "vaultPanel.holdingsBreakdown.skus.goldCoin22k", serial: "GK-CN-40952", grams: 0.42 },
  { skuKey: "vaultPanel.holdingsBreakdown.skus.goldCoin21k", serial: "GK-CN-40988", grams: 0.6 },
  { skuKey: "vaultPanel.holdingsBreakdown.skus.goldBar18k", serial: "GK-BR-90441", grams: 0.4 },
] as const;

const FREE_STORAGE_ALLOWANCE_G = 5;
const STORAGE_FEE_RATE_PER_YEAR = 0.005;

export function VaultPanel() {
  const { t } = useTranslation();
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
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("vaultPanel.storagePartner.label")}
            </p>
            <p className="mt-1 text-lg font-semibold">Securex Pvt. Ltd.</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("vaultPanel.storagePartner.description")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("vaultPanel.insurancePartner.label")}
            </p>
            <p className="mt-1 text-lg font-semibold">Green Delta Insurance</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("vaultPanel.insurancePartner.description")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{t("vaultPanel.holdingsBreakdown.title")}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => toast.info(t("vaultPanel.holdingsBreakdown.comingSoon"))}
            >
              <Download className="size-3.5" />
              {t("vaultPanel.holdingsBreakdown.downloadCertificate")}
            </Button>
          </div>
          <div className="divide-y">
            {HOLDINGS_BREAKDOWN.map((h) => (
              <div key={h.serial} className="flex items-center justify-between py-3 text-sm">
                <span className="font-medium">{t(h.skuKey)}</span>
                <span className="text-muted-foreground">{h.serial}</span>
                <span className="font-medium tabular-nums">{h.grams}g</span>
              </div>
            ))}
          </div>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">{t("vaultPanel.insuredValue")}</p>
              <p className="font-medium">{insuredValue !== null ? formatBDT(insuredValue) : "…"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("vaultPanel.compliance")}</p>
              <p className="font-medium">BAJUS · ECAB · BASIS member</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("vaultPanel.regulatoryId")}</p>
              <p className="font-medium">DBID approved, Ministry of Commerce</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <p className="font-semibold">{t("vaultPanel.storageFees.title")}</p>
          <Row label={t("vaultPanel.storageFees.freeAllowance")} value={t("vaultPanel.storageFees.upTo", { grams: FREE_STORAGE_ALLOWANCE_G })} />
          <Row
            label={t("vaultPanel.storageFees.feeAboveAllowance")}
            value={t("vaultPanel.storageFees.feeRate", { pct: STORAGE_FEE_RATE_PER_YEAR * 100 })}
          />
          <Row label={t("vaultPanel.storageFees.charged")} value={t("vaultPanel.storageFees.chargedValue")} />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("vaultPanel.storageFees.yourStatus")}</span>
            {balanceGrams !== null ? (
              <Badge className={withinFreeTier ? "bg-emerald-500/15 text-emerald-500" : undefined} variant={withinFreeTier ? undefined : "secondary"}>
                {withinFreeTier
                  ? t("vaultPanel.storageFees.withinFreeTier", {
                      balance: balanceGrams.toFixed(2),
                      allowance: FREE_STORAGE_ALLOWANCE_G,
                    })
                  : t("vaultPanel.storageFees.feeApplies", { balance: balanceGrams.toFixed(2) })}
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
