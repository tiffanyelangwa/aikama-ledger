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

export function monthRange(year: number, month: number): { start: string; end: string } {
  if (!Number.isInteger(year) || year < 1 || year > 9999 ||
      !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Choose a valid month (1–12) and year (1–9999).");
  }
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const prefix = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
  return { start: `${prefix}-01`, end: `${prefix}-${days[month - 1]}` };
}

export function currentMonthRange(): { start: string; end: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Dar_es_Salaam", year: "numeric", month: "numeric",
  }).formatToParts(new Date());
  return monthRange(
    Number(parts.find((p) => p.type === "year")!.value),
    Number(parts.find((p) => p.type === "month")!.value),
  );
}

export function trialBalanceRows(rows: LedgerSummaryRow[]): LedgerSummaryRow[] {
  return rows.map((row) => {
    const balance = Number(row.debit) - Number(row.credit);
    return { ...row, debit: Math.max(balance, 0), credit: Math.max(-balance, 0) };
  });
}
