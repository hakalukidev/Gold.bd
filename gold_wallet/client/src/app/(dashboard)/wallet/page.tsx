"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowUpRight,
  Coins,
  Copy,
  Gift,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { DeltaChip, FLOW_ACCENT, FlowStatTile, SectionLabel } from "@/components/shared/flow-stat-tile";
import { FLOW_IN_COLOR, FLOW_OUT_COLOR, MoneyFlowChart } from "@/components/shared/money-flow-chart";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { MoneyMoveTabs } from "@/components/forms/add-money-panel";
import { useMe } from "@/hooks/use-auth";
import { useWallet } from "@/hooks/use-wallet";
import { useGoldRate } from "@/hooks/use-gold-rate";
import { useMetalRate, type Metal } from "@/hooks/use-metal-rate";
import { useTransactions } from "@/hooks/use-transactions";
import { useFxRates } from "@/hooks/use-fx-rates";
import { formatBDT, formatForeign, formatGrams, formatUSDCompact, gramsToMg } from "@/lib/format";
import type { ForeignCurrency } from "@/lib/mock-rates";
import { MOCK_PURITY_MIX, MOCK_SILVER_PURITY_MIX, MOCK_WALLET } from "@/lib/mock-wallet";
import { REFERRAL_REWARD_GRAMS, referralCode } from "@/lib/referral";
import { MOCK_USER } from "@/lib/mock-user";
import { buildFlow, filterRange, formatRange, percentChange, windowTotals, type FlowFilter } from "@/lib/wallet-flow";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/use-translation";

type Direction = "deposit" | "withdraw";

/* -------------------------------------------------------------------------- */
/*  Balance + accounts                                                         */
/* -------------------------------------------------------------------------- */

/** Total balance = spendable cash + what the gold and silver holdings are
 * worth at today's rates, so the headline number covers everything the account
 * actually holds. */
function TotalBalanceCard({
  totalBDT,
  usdRate,
  netBDT,
  netPct,
  onManage,
  loading,
}: {
  totalBDT: number;
  /** Live BDT-per-USD quote from useFxRates() — falls back to the
   * illustrative mock-rates.ts figure while the feed hasn't loaded yet. */
  usdRate: number;
  netBDT: number;
  netPct: number | null;
  onManage: (direction: Direction) => void;
  /** True while ["wallet"] is still in flight — shown as a skeleton instead of
   * a ৳0.00 that could be read as a confirmed empty balance. */
  loading: boolean;
}) {
  const positive = netBDT >= 0;
  const { t } = useTranslation();

  return (
    <Card className="relative">
      <CardContent className="relative space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <SectionLabel>{t("wallet.totalBalance.label")}</SectionLabel>
              <DeltaChip pct={netPct} />
            </div>
            {loading ? (
              <>
                <Skeleton className="mt-2 h-8 w-40" />
                <Skeleton className="mt-2 h-3 w-56" />
              </>
            ) : (
              <>
                <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">{formatBDT(totalBDT)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {"≈ "}
                  {formatUSDCompact(totalBDT / usdRate)} · {t("wallet.totalBalance.approxCashMetals")}
                </p>
              </>
            )}
          </div>

          {/* Wallet mark from public/wallet_assets — decorative. */}
          <Image src="/wallet_assets/wallet.png" alt="" width={48} height={48} aria-hidden className="size-12 shrink-0 drop-shadow-sm" />
        </div>

        <p className={cn("text-xs font-medium tabular-nums", positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
          {positive ? "+" : "−"}
          {formatBDT(Math.abs(netBDT))}{" "}
          <span className="font-normal text-muted-foreground">{t("wallet.totalBalance.netLast30")}</span>
        </p>

        <div className="flex gap-2">
          <Button variant="gold-solid" size="lg" className="flex-1" onClick={() => onManage("deposit")}>
            <ArrowDownToLine />
            {t("wallet.totalBalance.addMoney")}
          </Button>
          <Button variant="outline" size="lg" className="flex-1" onClick={() => onManage("withdraw")}>
            <ArrowUpFromLine />
            {t("wallet.totalBalance.withdraw")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Card faces for the three places value actually sits. The dark cash face
 * carries its own ring — the dashboard's dark theme sits at nearly the same
 * value, so without one the card edge disappears. */
const ACCOUNT_TONE = {
  cash: {
    face: "bg-linear-to-br from-[#26262c] via-[#1f1f26] to-[#3d2f14] text-white ring-1 ring-gold/25",
    sheen: "bg-gold/25",
    muted: "text-white/60",
    skeleton: "bg-white/15",
  },
  gold: {
    face: "bg-linear-to-br from-gold-light via-gold to-[#a37f1c] text-ink",
    sheen: "bg-white/35",
    muted: "text-ink/70",
    skeleton: "bg-ink/10",
  },
  silver: {
    face: "bg-linear-to-br from-[#eef1f5] via-[#c4cbd3] to-[#8d959f] text-ink",
    sheen: "bg-white/45",
    muted: "text-ink/65",
    skeleton: "bg-ink/10",
  },
} as const;

/** The reference design's stacked credit cards, in this app's terms: the three
 * places money actually sits — the spendable cash wallet, the gold vault and
 * the silver vault. */
function AccountCard({
  tone,
  art,
  label,
  value,
  footLeft,
  footRight,
  loading,
}: {
  tone: keyof typeof ACCOUNT_TONE;
  art: string;
  label: string;
  value: string;
  footLeft: string;
  footRight: string;
  /** True while ["wallet"] is still in flight — see TotalBalanceCard. Shows
   * skeleton bars sized to the real content instead of `value`/`footLeft`,
   * tinted to stay visible against each card's own face. */
  loading?: boolean;
}) {
  const { face, sheen, muted, skeleton } = ACCOUNT_TONE[tone];

  return (
    <div className={cn("relative overflow-hidden rounded-md p-4 shadow-sm", face)}>
      {/* soft highlight — the sheen a plastic card face has */}
      <span aria-hidden className={cn("pointer-events-none absolute -top-12 -right-10 size-36 rounded-full blur-2xl", sheen)} />

      <div className="relative flex items-start justify-between gap-2">
        <span className={cn("text-[11px] font-semibold tracking-wide uppercase", muted)}>{label}</span>
        <Image src={art} alt="" width={44} height={44} aria-hidden className="size-11 drop-shadow-sm" />
      </div>

      <div className="relative mt-4 text-2xl font-bold tracking-tight tabular-nums">
        {loading ? <Skeleton className={cn("h-7 w-28", skeleton)} /> : value}
      </div>

      <div className={cn("relative mt-5 flex items-end justify-between text-[11px]", muted)}>
        <span className="tabular-nums">{loading ? <Skeleton className={cn("h-3 w-20", skeleton)} /> : footLeft}</span>
        <span className="font-semibold">{footRight}</span>
      </div>
    </div>
  );
}

function MyAccounts({
  cashBDT,
  goldGrams,
  goldValueBDT,
  silverGrams,
  silverValueBDT,
  loading,
}: {
  cashBDT: number;
  goldGrams: string;
  goldValueBDT: number;
  silverGrams: string;
  silverValueBDT: number;
  /** True while ["wallet"] is still in flight — see TotalBalanceCard. */
  loading: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("wallet.myAccounts.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <AccountCard
          tone="cash"
          art="/wallet_assets/cash-stack.png"
          label={t("wallet.myAccounts.cashWallet")}
          value={formatBDT(cashBDT)}
          footLeft={t("wallet.myAccounts.spendableInstantly")}
          footRight="BDT"
          loading={loading}
        />
        <AccountCard
          tone="gold"
          art="/wallet_assets/coin-stack.png"
          label={t("wallet.myAccounts.goldVault")}
          value={formatGrams(gramsToMg(goldGrams))}
          footLeft={`≈ ${formatBDT(goldValueBDT)}`}
          footRight={MOCK_PURITY_MIX[0].label}
          loading={loading}
        />
        <AccountCard
          tone="silver"
          art="/wallet_assets/silver.png"
          label={t("wallet.myAccounts.silverVault")}
          value={formatGrams(gramsToMg(silverGrams))}
          footLeft={`≈ ${formatBDT(silverValueBDT)}`}
          footRight={MOCK_SILVER_PURITY_MIX[0].label}
          loading={loading}
        />
        <Button
          variant="outline"
          className="w-full"
          nativeButton={false}
          render={
            <Link href="/vault">
              <ShieldCheck />
              {t("wallet.myAccounts.manageVault")}
            </Link>
          }
        />
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Holdings by purity                                                         */
/* -------------------------------------------------------------------------- */

const DONUT_RADIUS = 36;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

const METAL_TABS: { key: Metal; labelKey: "wallet.holdingsByPurity.gold" | "wallet.holdingsByPurity.silver" }[] = [
  { key: "gold", labelKey: "wallet.holdingsByPurity.gold" },
  { key: "silver", labelKey: "wallet.holdingsByPurity.silver" },
];

/** Purity split of the vaulted metal, drawn as a donut from two-line SVG arcs —
 * each slice is a dash of the circumference, offset by everything before it.
 * Gold is graded by karat, silver by fineness, so the card toggles between the
 * two holdings rather than mixing incomparable grades into one ring. */
function HoldingsByPurity({ goldGrams, silverGrams }: { goldGrams: number; silverGrams: number }) {
  const [metal, setMetal] = useState<Metal>("gold");
  const { t } = useTranslation();

  const mix = metal === "gold" ? MOCK_PURITY_MIX : MOCK_SILVER_PURITY_MIX;
  const grams = metal === "gold" ? goldGrams : silverGrams;

  // Each slice starts where every earlier slice ended.
  const slices = mix.map((slice, i) => {
    const precedingShare = mix.slice(0, i).reduce((sum, s) => sum + s.share, 0);
    return { ...slice, length: DONUT_CIRCUMFERENCE * slice.share, offset: DONUT_CIRCUMFERENCE * precedingShare };
  });

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionLabel>{t("wallet.holdingsByPurity.title")}</SectionLabel>
          <div className="flex rounded-md border p-0.5">
            {METAL_TABS.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMetal(m.key)}
                aria-pressed={metal === m.key}
                className={cn(
                  "rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors",
                  metal === m.key ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t(m.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <svg
            viewBox="0 0 100 100"
            className="size-28 shrink-0 -rotate-90"
            role="img"
            aria-label={t("wallet.holdingsByPurity.ariaSplit", {
              metal: metal === "gold" ? t("wallet.holdingsByPurity.gold") : t("wallet.holdingsByPurity.silver"),
            })}
          >
            <circle cx="50" cy="50" r={DONUT_RADIUS} fill="none" className="stroke-muted" strokeWidth="13" />
            {slices.map((slice) => (
              <circle
                key={slice.label}
                cx="50"
                cy="50"
                r={DONUT_RADIUS}
                fill="none"
                stroke={slice.color}
                strokeWidth="13"
                strokeDasharray={`${slice.length} ${DONUT_CIRCUMFERENCE - slice.length}`}
                strokeDashoffset={-slice.offset}
              />
            ))}
          </svg>

          <ul className="min-w-0 flex-1 space-y-2">
            {slices.map((slice) => (
              <li key={slice.label} className="flex items-center gap-2 text-sm">
                <span className="size-2 shrink-0 rounded-full" style={{ background: slice.color }} />
                <span className="font-semibold">{slice.label}</span>
                <span className="text-muted-foreground tabular-nums">{(grams * slice.share).toFixed(2)}g</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Refer & earn                                                               */
/* -------------------------------------------------------------------------- */

/** Same referral code shape the profile page shows, so a user sees one code in
 * both places. No referral backend exists (see CLAUDE.md) — copying the code is
 * the one thing here that actually does something. */
function ReferAndEarn() {
  const { data } = useMe();
  const { t } = useTranslation();
  const user = data ?? MOCK_USER;
  const code = referralCode(user.id);

  function copyCode() {
    navigator.clipboard?.writeText(code).then(
      () => toast.success(t("wallet.referAndEarn.copied")),
      () => toast.error(t("wallet.referAndEarn.copyError"))
    );
  }

  return (
    <Card className="bg-linear-to-br from-gold/10 via-card to-card">
      <CardContent className="flex h-full flex-col gap-3">
        <div>
          <p className="font-semibold">{t("wallet.referAndEarn.title")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("wallet.referAndEarn.body", { grams: REFERRAL_REWARD_GRAMS })}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 rounded-md border border-dashed border-gold/40 bg-gold/5 py-2 pr-2 pl-3">
          <code className="truncate font-mono text-sm tracking-wide text-gold">{code}</code>
          <Button variant="gold-solid" size="sm" onClick={copyCode}>
            <Copy />
            {t("wallet.referAndEarn.copy")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Quick links                                                                */
/* -------------------------------------------------------------------------- */

// `anim` picks the hover motion the glyph plays (keyframes in globals.css) —
// each one mimes the action it triggers.
const QUICK_LINKS: { labelKey: string; icon: LucideIcon; anim: string; href?: string; direction?: Direction }[] = [
  { labelKey: "wallet.quickLinks.deposit", icon: ArrowDownToLine, anim: "quick-icon-drop", direction: "deposit" },
  { labelKey: "wallet.quickLinks.withdraw", icon: ArrowUpFromLine, anim: "quick-icon-lift", direction: "withdraw" },
  { labelKey: "wallet.quickLinks.buyGold", icon: Coins, anim: "quick-icon-flip", href: "/buy-gold" },
  { labelKey: "wallet.quickLinks.sellGold", icon: ArrowUpRight, anim: "quick-icon-fly", href: "/sell-gold" },
  { labelKey: "wallet.quickLinks.giftGold", icon: Gift, anim: "quick-icon-wiggle", href: "/gift-gold" },
  { labelKey: "wallet.quickLinks.statement", icon: ReceiptText, anim: "quick-icon-page-turn", href: "/transactions" },
];

const QUICK_LINK_CLASS =
  "quick-link group flex flex-col items-center gap-2 rounded-md px-2 py-3 text-center transition-colors hover:text-gold focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

function QuickLinkIcon({ icon: Icon, anim }: { icon: LucideIcon; anim: string }) {
  return (
    <span className="flex size-10 items-center justify-center text-white transition-colors group-hover:text-gold">
      <Icon className={cn("size-5", anim)} strokeWidth={1.75} />
    </span>
  );
}

function QuickLinks({ onManage }: { onManage: (direction: Direction) => void }) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("wallet.quickLinks.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {QUICK_LINKS.map((link) =>
            link.href ? (
              <Link key={link.labelKey} href={link.href} className={QUICK_LINK_CLASS}>
                <QuickLinkIcon icon={link.icon} anim={link.anim} />
                <span className="text-xs font-medium">{t(link.labelKey)}</span>
              </Link>
            ) : (
              <button
                key={link.labelKey}
                type="button"
                onClick={() => onManage(link.direction ?? "deposit")}
                className={QUICK_LINK_CLASS}
              >
                <QuickLinkIcon icon={link.icon} anim={link.anim} />
                <span className="text-xs font-medium">{t(link.labelKey)}</span>
              </button>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Currency conversion                                                        */
/* -------------------------------------------------------------------------- */

const CURRENCY_NAME_KEY: Record<ForeignCurrency, "USD" | "EUR" | "GBP" | "SAR"> = {
  USD: "USD",
  EUR: "EUR",
  GBP: "GBP",
  SAR: "SAR",
};

// Symbol chips rather than the reference's flag icons — flag emoji don't render
// on Windows, and a symbol reads the same at this size.
const CURRENCY_SYMBOL: Record<ForeignCurrency, string> = { USD: "$", EUR: "€", GBP: "£", SAR: "﷼" };

function CurrencyCard({ totalBDT }: { totalBDT: number }) {
  // Live BDT-per-unit quotes (see fx-sync.job.js on wallet_server), falling
  // back to the illustrative mock-rates.ts figures until the first fetch
  // lands or if it ever fails.
  const { ratesPerUnit, isLive } = useFxRates();
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image src="/wallet_assets/dollar.png" alt="" width={22} height={22} aria-hidden className="size-5.5" />
          {t("wallet.currency.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {(Object.keys(ratesPerUnit) as ForeignCurrency[]).map((code) => (
            <li key={code} className="flex items-center gap-3 py-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">{CURRENCY_SYMBOL[code]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{code}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {t(`wallet.currency.names.${CURRENCY_NAME_KEY[code]}`)}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums">{formatForeign(totalBDT / ratesPerUnit[code], code)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {t("wallet.currency.footer", {
            rateType: isLive ? t("wallet.currency.liveRates") : t("wallet.currency.indicativeRates"),
          })}
        </p>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function WalletPage() {
  // `/api/wallet` is real now (wallet_server's wallet module — cash comes from
  // confirmed SSLCommerz deposits; gold/silver stay 0 until a trading module
  // exists). `/api/transactions` still doesn't, so that query falls back to
  // an empty list. walletLoading drives a spinner for every figure below
  // that's derived from the wallet, so a still-loading balance never reads as
  // a confirmed zero — WalletBadge/WalletPill do the same. The rate queries
  // are real too, so they just read 0 until their first tick arrives.
  const { t } = useTranslation();
  const { data: walletData, isLoading: walletLoading } = useWallet();
  const { data: rateData } = useGoldRate();
  const { data: silverRateData } = useMetalRate("silver");
  const { data: transactionsData } = useTransactions();
  const { ratesPerUnit: fxRatesPerUnit } = useFxRates();

  const wallet = walletData ?? MOCK_WALLET;
  const transactions = transactionsData ?? [];
  const pricePerGram = Number(rateData?.pricePerGramBDT ?? 0);
  const silverPerGram = Number(silverRateData?.pricePerGramBDT ?? 0);

  const [manage, setManage] = useState<Direction | null>(null);
  const [flowFilter, setFlowFilter] = useState<FlowFilter>({ kind: "preset", preset: "month" });

  const cashBDT = Number(wallet.cashBalanceBDT);
  const goldGrams = Number(wallet.goldBalanceGrams);
  const goldValueBDT = goldGrams * pricePerGram;
  const silverGrams = Number(wallet.silverBalanceGrams);
  const silverValueBDT = silverGrams * silverPerGram;
  const totalBDT = cashBDT + goldValueBDT + silverValueBDT;

  const last30 = useMemo(() => windowTotals(transactions, { days: 30 }), [transactions]);
  const prev30 = useMemo(() => windowTotals(transactions, { days: 30, offsetDays: 30 }), [transactions]);
  const flowRange = useMemo(() => filterRange(flowFilter), [flowFilter]);
  const flow = useMemo(() => buildFlow(transactions, flowRange), [transactions, flowRange]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("wallet.header.title")} description={t("wallet.header.description")} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:items-start">
        {/* ---------- Balance, accounts, currency ---------- */}
        <div className="space-y-4 lg:sticky lg:top-6">
          <TotalBalanceCard
            totalBDT={totalBDT}
            usdRate={fxRatesPerUnit.USD}
            netBDT={last30.netBDT}
            netPct={percentChange(last30.netBDT, prev30.netBDT)}
            onManage={setManage}
            loading={walletLoading}
          />
          <MyAccounts
            cashBDT={cashBDT}
            goldGrams={wallet.goldBalanceGrams}
            goldValueBDT={goldValueBDT}
            silverGrams={wallet.silverBalanceGrams}
            silverValueBDT={silverValueBDT}
            loading={walletLoading}
          />
          <CurrencyCard totalBDT={totalBDT} />
        </div>

        {/* ---------- Actions, flow, goals ---------- */}
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <HoldingsByPurity goldGrams={goldGrams} silverGrams={silverGrams} />
            <ReferAndEarn />
          </div>

          <QuickLinks onManage={setManage} />

          <div className="grid gap-4 sm:grid-cols-3">
            <FlowStatTile
              icon={ArrowDownToLine}
              label={t("wallet.flowStats.moneyIn")}
              value={formatBDT(last30.inBDT)}
              pct={percentChange(last30.inBDT, prev30.inBDT)}
              accent={FLOW_ACCENT.in}
              caption={t("transactions.ranges.last30Days")}
            />
            <FlowStatTile
              icon={ArrowUpFromLine}
              label={t("wallet.flowStats.moneyOut")}
              value={formatBDT(last30.outBDT)}
              pct={percentChange(last30.outBDT, prev30.outBDT)}
              invertColor
              accent={FLOW_ACCENT.out}
              caption={t("transactions.ranges.last30Days")}
            />
            <FlowStatTile
              icon={PiggyBank}
              label={t("wallet.flowStats.netSaved")}
              value={formatBDT(last30.netBDT)}
              pct={percentChange(last30.netBDT, prev30.netBDT)}
              accent={FLOW_ACCENT.net}
              caption={t("transactions.ranges.last30Days")}
            />
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>{t("wallet.moneyFlow.title")}</CardTitle>
                  <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">{formatRange(flowRange)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ background: FLOW_IN_COLOR }} />
                      {t("wallet.moneyFlow.in")}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ background: FLOW_OUT_COLOR }} />
                      {t("wallet.moneyFlow.out")}
                    </span>
                  </div>
                  <DateRangeFilter value={flowFilter} onChange={setFlowFilter} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <MoneyFlowChart data={flow} />
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                nativeButton={false}
                render={
                  <Link href="/transactions">
                    <ReceiptText />
                    {t("wallet.moneyFlow.seeFullStatement")}
                  </Link>
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ---------- Add money / withdraw ---------- */}
      <Dialog open={manage !== null} onOpenChange={(open) => !open && setManage(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("wallet.manageDialog.title")}</DialogTitle>
            <DialogDescription>{t("wallet.manageDialog.description")}</DialogDescription>
          </DialogHeader>
          {manage && <MoneyMoveTabs key={manage} defaultDirection={manage} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
