import { TYPE_LABEL } from "@/lib/transaction-labels";
import type { TransactionSummary } from "@/types";

const COLUMNS = [
  "Date",
  "Description",
  "Type",
  "Status",
  "Gold (g)",
  "Rate (BDT/g)",
  "Amount (BDT)",
] as const;

/** Wrap a cell for CSV: quote it and double any embedded quotes. A leading
 * `=`/`+`/`-`/`@` is prefixed with a tab so spreadsheets treat the value as
 * text rather than a formula. */
function cell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `\t${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/**
 * The History page's rows as CSV — money amounts stay the raw decimal strings
 * the API sends (see CLAUDE.md) rather than the formatted "৳1,234.00" shown on
 * screen, so the file opens as numbers in a spreadsheet. Exports whatever the
 * page currently has filtered, newest first.
 */
export function toTransactionCsv(transactions: TransactionSummary[]): string {
  const rows = transactions.map((t) =>
    [
      new Date(t.createdAt).toISOString(),
      TYPE_LABEL[t.type],
      t.type,
      t.status,
      t.goldGrams ?? "",
      t.pricePerGramBDT ?? "",
      t.totalAmountBDT,
    ]
      .map(cell)
      .join(",")
  );

  // BOM so Excel reads the file as UTF-8 instead of the local codepage.
  return `﻿${COLUMNS.map(cell).join(",")}\n${rows.join("\n")}\n`;
}

/** Hand the CSV to the browser as a file download. */
export function downloadCsv(filename: string, csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
