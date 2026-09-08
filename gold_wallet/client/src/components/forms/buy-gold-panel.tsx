"use client";

import { useState } from "react";
import { Sparkles, Gem } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DigitalGoldPanel } from "@/components/forms/digital-gold-panel";
import { PhysicalGoldPanel } from "@/components/forms/physical-gold-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/lib/i18n/use-translation";

type BuyTab = "digital" | "physical";

/**
 * The buy page's two purchase routes, as a tab switch rather than both shown
 * at once: DigitalGoldPanel (instant — plain weight of gold/silver, credited
 * to the wallet balance the moment it's paid) or PhysicalGoldPanel (a
 * specific minted SKU, couriered to a delivery address, ending in a
 * printable invoice). Both price off the same live rates and debit the same
 * cash wallet — see lib/trade-products.ts for the SKU catalog they share.
 */
export function BuyGoldPanel() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<BuyTab>("digital");

  return (
    <div data-buy-page className="w-full min-w-0 space-y-4">
      <PageHeader title={t("buyGoldPanel.title")} />

      <Tabs value={tab} onValueChange={(v) => setTab(v as BuyTab)}>
        <TabsList aria-label={t("buyGoldPanel.purchaseType")} className="w-full max-w-sm rounded-xl border border-border/60 bg-muted/40 p-1 group-data-horizontal/tabs:h-11">
          <TabsTrigger
            value="digital"
            className="flex-1 gap-2 rounded-xl py-2 data-active:border-gold/40 data-active:bg-gold/15 data-active:text-gold-accent dark:data-active:border-gold/40 dark:data-active:bg-gold/15 dark:data-active:text-gold-accent"
          >
            <Sparkles className="size-4" strokeWidth={1.75} />
            {t("buyGoldPanel.digitalGold")}
          </TabsTrigger>
          <TabsTrigger
            value="physical"
            className="flex-1 gap-2 rounded-xl py-2 data-active:border-gold/40 data-active:bg-gold/15 data-active:text-gold-accent dark:data-active:border-gold/40 dark:data-active:bg-gold/15 dark:data-active:text-gold-accent"
          >
            <Gem className="size-4" strokeWidth={1.75} />
            {t("buyGoldPanel.physicalGold")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="digital" className="mt-2">
          <DigitalGoldPanel />
        </TabsContent>
        <TabsContent value="physical" className="mt-2 w-full min-w-0">
          <PhysicalGoldPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
