import type { LedgerSummaryRow } from "@/types/database";

// Normal-balance convention per category: assets & expenses are debit-normal,
// revenue/liability/equity are credit-normal.
export function accountBalance(row: LedgerSummaryRow): number {
  const debit = Number(row.debit);
  const credit = Number(row.credit);
  if (row.category === "asset" || row.category === "expense") {
    return debit - credit;
  }
  return credit - debit;
}

export function netProfit(rows: LedgerSummaryRow[]): number {
  const revenue = rows
    .filter((r) => r.category === "revenue")
    .reduce((sum, r) => sum + accountBalance(r), 0);
  const expense = rows
    .filter((r) => r.category === "expense")
    .reduce((sum, r) => sum + accountBalance(r), 0);
  return revenue - expense;
}

export function formatMoney(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function currentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const toISODate = (d: Date) => d.toISOString().slice(0, 10);
  return { start: toISODate(start), end: toISODate(end) };
}
