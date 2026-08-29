/** Format a BDT amount (accepts number or numeric string) as "৳ 1,23,456.50" (South Asian grouping). */
export function formatBDT(amount: number | string): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  const formatted = new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    currencyDisplay: "symbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return formatted;
}

/** Gold balances are stored in the DB as integer milligrams to avoid floating-point drift. */
export function mgToGrams(mg: number | string): string {
  const n = typeof mg === "string" ? Number(mg) : mg;
  return (n / 1000).toFixed(3);
}

export function gramsToMg(grams: number | string): number {
  const n = typeof grams === "string" ? Number(grams) : grams;
  return Math.round(n * 1000);
}

export function formatGrams(mg: number | string): string {
  return `${mgToGrams(mg)} g`;
}

export function formatDateTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

/** Bangladesh phone numbers: 01XXXXXXXXX (11 digits, starts with 01). Accepts optional +88 prefix. */
export function normalizeBdPhone(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "");
  const local = digits.startsWith("88") ? digits.slice(2) : digits;
  if (/^01[3-9]\d{8}$/.test(local)) return local;
  return null;
}

/** "4,250 BDT" — compact, symbol-free amount for tight chrome like the dashboard top bar. */
export function formatBDTCompact(amount: number | string): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return `${new Intl.NumberFormat("en-BD", { maximumFractionDigits: 0 }).format(n)} BDT`;
}

/** "$34.86" — the USD view of a balance (see USD_BDT_RATE in mock-rates.ts). */
export function formatUSDCompact(amount: number | string): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

/** "€1,204.55" — a BDT balance converted into another currency (see BDT_PER_FOREIGN_UNIT in mock-rates.ts). */
export function formatForeign(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** "৳56.2k" / "৳1.2L" — short taka for tight spots like chart axis labels. */
export function formatBDTShort(amount: number | string): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  const abs = Math.abs(n);
  if (abs >= 100000) return `৳${(n / 100000).toFixed(abs >= 1000000 ? 0 : 1)}L`; // lakh, the local unit
  if (abs >= 1000) return `৳${(n / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
  return `৳${Math.round(n)}`;
}
