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
import { formatBDT, formatForeign, formatGrams, formatUSDCompact, gramsToMg } from "@/lib/format";
import { BDT_PER_FOREIGN_UNIT, getLatestRate, USD_BDT_RATE, type ForeignCurrency } from "@/lib/mock-rates";
import { getMockTransactions } from "@/lib/mock-transactions";
import { MOCK_PURITY_MIX, MOCK_SILVER_PURITY_MIX, MOCK_WALLET } from "@/lib/mock-wallet";
import { REFERRAL_REWARD_GRAMS, referralCode } from "@/lib/referral";
import { MOCK_USER } from "@/lib/mock-user";
import { buildFlow, filterRange, formatRange, percentChange, windowTotals, type FlowFilter } from "@/lib/wallet-flow";
import { cn } from "@/lib/utils";

type Direction = "deposit" | "withdraw";

/* -------------------------------------------------------------------------- */
/*  Balance + accounts                                                         */
/* -------------------------------------------------------------------------- */

/** Total balance = spendable cash + what the gold and silver holdings are
 * worth at today's rates, so the headline number covers everything the account
 * actually holds. */
function TotalBalanceCard({
  totalBDT,
  netBDT,
  netPct,
  onManage,
}: {
  totalBDT: number;
  netBDT: number;
  netPct: number | null;
  onManage: (direction: Direction) => void;
}) {
  const positive = netBDT >= 0;

  return (
    <Card className="relative">
      <CardContent className="relative space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <SectionLabel>Total balance</SectionLabel>
              <DeltaChip pct={netPct} />
            </div>
            <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">{formatBDT(totalBDT)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {"≈ "}
              {formatUSDCompact(totalBDT / USD_BDT_RATE)} · cash + metals at today&apos;s rates
            </p>
          </div>

          {/* Wallet mark from public/wallet_assets — decorative. */}
          <Image src="/wallet_assets/wallet.png" alt="" width={48} height={48} aria-hidden className="size-12 shrink-0 drop-shadow-sm" />
        </div>

        <p className={cn("text-xs font-medium tabular-nums", positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
          {positive ? "+" : "−"}
          {formatBDT(Math.abs(netBDT))} <span className="font-normal text-muted-foreground">net, last 30 days</span>
        </p>

        <div className="flex gap-2">
          <Button variant="gold-solid" size="lg" className="flex-1" onClick={() => onManage("deposit")}>
            <ArrowDownToLine />
            Add money
          </Button>
          <Button variant="outline" size="lg" className="flex-1" onClick={() => onManage("withdraw")}>
            <ArrowUpFromLine />
            Withdraw
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
  },
  gold: {
    face: "bg-linear-to-br from-gold-light via-gold to-[#a37f1c] text-ink",
    sheen: "bg-white/35",
    muted: "text-ink/70",
  },
  silver: {
    face: "bg-linear-to-br from-[#eef1f5] via-[#c4cbd3] to-[#8d959f] text-ink",
    sheen: "bg-white/45",
    muted: "text-ink/65",
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
}: {
  tone: keyof typeof ACCOUNT_TONE;
  art: string;
  label: string;
  value: string;
  footLeft: string;
  footRight: string;
}) {
  const { face, sheen, muted } = ACCOUNT_TONE[tone];

  return (
    <div className={cn("relative overflow-hidden rounded-md p-4 shadow-sm", face)}>
      {/* soft highlight — the sheen a plastic card face has */}
      <span aria-hidden className={cn("pointer-events-none absolute -top-12 -right-10 size-36 rounded-full blur-2xl", sheen)} />

      <div className="relative flex items-start justify-between gap-2">
        <span className={cn("text-[11px] font-semibold tracking-wide uppercase", muted)}>{label}</span>
        <Image src={art} alt="" width={44} height={44} aria-hidden className="size-11 drop-shadow-sm" />
      </div>

      <p className="relative mt-4 text-2xl font-bold tracking-tight tabular-nums">{value}</p>

      <div className={cn("relative mt-5 flex items-end justify-between text-[11px]", muted)}>
        <span className="tabular-nums">{footLeft}</span>
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
}: {
  cashBDT: number;
  goldGrams: string;
  goldValueBDT: number;
  silverGrams: string;
  silverValueBDT: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>My accounts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <AccountCard
          tone="cash"
          art="/wallet_assets/cash-stack.png"
          label="Cash wallet"
          value={formatBDT(cashBDT)}
          footLeft="Spendable instantly"
          footRight="BDT"
        />
        <AccountCard
          tone="gold"
          art="/wallet_assets/coin-stack.png"
          label="Gold vault"
          value={formatGrams(gramsToMg(goldGrams))}
          footLeft={`≈ ${formatBDT(goldValueBDT)}`}
          footRight={MOCK_PURITY_MIX[0].label}
        />
        <AccountCard
          tone="silver"
          art="/wallet_assets/silver.png"
          label="Silver vault"
          value={formatGrams(gramsToMg(silverGrams))}
          footLeft={`≈ ${formatBDT(silverValueBDT)}`}
          footRight={MOCK_SILVER_PURITY_MIX[0].label}
        />
        <Button
          variant="outline"
          className="w-full"
          nativeButton={false}
          render={
            <Link href="/vault">
              <ShieldCheck />
              Manage vault
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

const METAL_TABS: { key: Metal; label: string }[] = [
  { key: "gold", label: "Gold" },
  { key: "silver", label: "Silver" },
];

/** Purity split of the vaulted metal, drawn as a donut from two-line SVG arcs —
 * each slice is a dash of the circumference, offset by everything before it.
 * Gold is graded by karat, silver by fineness, so the card toggles between the
 * two holdings rather than mixing incomparable grades into one ring. */
function HoldingsByPurity({ goldGrams, silverGrams }: { goldGrams: number; silverGrams: number }) {
  const [metal, setMetal] = useState<Metal>("gold");

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
          <SectionLabel>Holdings by purity</SectionLabel>
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
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <svg viewBox="0 0 100 100" className="size-28 shrink-0 -rotate-90" role="img" aria-label={`${metal === "gold" ? "Gold" : "Silver"} holdings split by purity`}>
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
  const user = data ?? MOCK_USER;
  const code = referralCode(user.id);

  function copyCode() {
    navigator.clipboard?.writeText(code).then(
      () => toast.success("Referral code copied"),
      () => toast.error("Couldn't copy — try again")
    );
  }

  return (
    <Card className="bg-linear-to-br from-gold/10 via-card to-card">
      <CardContent className="flex h-full flex-col gap-3">
        <div>
          <p className="font-semibold">Refer &amp; earn free gold</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite friends to Gold.bd — you both get {REFERRAL_REWARD_GRAMS}g gold when they make their first purchase.
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 rounded-md border border-dashed border-gold/40 bg-gold/5 py-2 pr-2 pl-3">
          <code className="truncate font-mono text-sm tracking-wide text-gold">{code}</code>
          <Button variant="gold-solid" size="sm" onClick={copyCode}>
            <Copy />
            Copy
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
const QUICK_LINKS: { label: string; icon: LucideIcon; anim: string; href?: string; direction?: Direction }[] = [
  { label: "Deposit", icon: ArrowDownToLine, anim: "quick-icon-drop", direction: "deposit" },
  { label: "Withdraw", icon: ArrowUpFromLine, anim: "quick-icon-lift", direction: "withdraw" },
  { label: "Buy gold", icon: Coins, anim: "quick-icon-flip", href: "/buy-gold" },
  { label: "Sell gold", icon: ArrowUpRight, anim: "quick-icon-fly", href: "/sell-gold" },
  { label: "Gift gold", icon: Gift, anim: "quick-icon-wiggle", href: "/gift-gold" },
  { label: "Statement", icon: ReceiptText, anim: "quick-icon-page-turn", href: "/transactions" },
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick links</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {QUICK_LINKS.map((link) =>
            link.href ? (
              <Link key={link.label} href={link.href} className={QUICK_LINK_CLASS}>
                <QuickLinkIcon icon={link.icon} anim={link.anim} />
                <span className="text-xs font-medium">{link.label}</span>
              </Link>
            ) : (
              <button key={link.label} type="button" onClick={() => onManage(link.direction ?? "deposit")} className={QUICK_LINK_CLASS}>
                <QuickLinkIcon icon={link.icon} anim={link.anim} />
                <span className="text-xs font-medium">{link.label}</span>
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

const CURRENCY_NAME: Record<ForeignCurrency, string> = {
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "Pound Sterling",
  SAR: "Saudi Riyal",
};

// Symbol chips rather than the reference's flag icons — flag emoji don't render
// on Windows, and a symbol reads the same at this size.
const CURRENCY_SYMBOL: Record<ForeignCurrency, string> = { USD: "$", EUR: "€", GBP: "£", SAR: "﷼" };

function CurrencyCard({ totalBDT }: { totalBDT: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image src="/wallet_assets/dollar.png" alt="" width={22} height={22} aria-hidden className="size-5.5" />
          Currency
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {(Object.keys(BDT_PER_FOREIGN_UNIT) as ForeignCurrency[]).map((code) => (
            <li key={code} className="flex items-center gap-3 py-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">{CURRENCY_SYMBOL[code]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{code}</p>
                <p className="truncate text-[11px] text-muted-foreground">{CURRENCY_NAME[code]}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums">{formatForeign(totalBDT / BDT_PER_FOREIGN_UNIT[code], code)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-muted-foreground">Your total balance at indicative rates.</p>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function WalletPage() {
  // Neither `/api/wallet` nor `/api/transactions` exists in this repo (see
  // CLAUDE.md), so each query falls back to its demo stand-in the way WalletPill
  // and WalletActivity already do — every figure below is derived from whichever
  // source is live, not hardcoded into the layout.
  const { data: walletData } = useWallet();
  const { data: rateData } = useGoldRate();
  const { data: silverRateData } = useMetalRate("silver");
  const { data: transactionsData } = useTransactions();

  const wallet = walletData ?? MOCK_WALLET;
  const transactions = transactionsData ?? getMockTransactions();
  const pricePerGram = Number((rateData ?? getLatestRate("gold")).pricePerGramBDT);
  const silverPerGram = Number((silverRateData ?? getLatestRate("silver")).pricePerGramBDT);

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
      <PageHeader title="My Wallet" description="Money in, money out, and everything your account holds" />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:items-start">
        {/* ---------- Balance, accounts, currency ---------- */}
        <div className="space-y-4 lg:sticky lg:top-6">
          <TotalBalanceCard totalBDT={totalBDT} netBDT={last30.netBDT} netPct={percentChange(last30.netBDT, prev30.netBDT)} onManage={setManage} />
          <MyAccounts
            cashBDT={cashBDT}
            goldGrams={wallet.goldBalanceGrams}
            goldValueBDT={goldValueBDT}
            silverGrams={wallet.silverBalanceGrams}
            silverValueBDT={silverValueBDT}
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
              label="Money in"
              value={formatBDT(last30.inBDT)}
              pct={percentChange(last30.inBDT, prev30.inBDT)}
              accent={FLOW_ACCENT.in}
            />
            <FlowStatTile
              icon={ArrowUpFromLine}
              label="Money out"
              value={formatBDT(last30.outBDT)}
              pct={percentChange(last30.outBDT, prev30.outBDT)}
              invertColor
              accent={FLOW_ACCENT.out}
            />
            <FlowStatTile
              icon={PiggyBank}
              label="Net saved"
              value={formatBDT(last30.netBDT)}
              pct={percentChange(last30.netBDT, prev30.netBDT)}
              accent={FLOW_ACCENT.net}
            />
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Money flow</CardTitle>
                  <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">{formatRange(flowRange)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ background: FLOW_IN_COLOR }} />
                      In
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ background: FLOW_OUT_COLOR }} />
                      Out
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
                    See full statement
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
            <DialogTitle>Manage balance</DialogTitle>
            <DialogDescription>Top up your wallet or send funds back to your payment method.</DialogDescription>
          </DialogHeader>
          {manage && <MoneyMoveTabs key={manage} defaultDirection={manage} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
