import type { AccountCategory } from "@/types/database";

// Same ranges as the code_matches_category check constraint in schema.sql.
export const CATEGORY_RANGES: Record<AccountCategory, [number, number]> = {
  revenue: [1000, 1399],
  expense: [1400, 1999],
  asset: [2000, 2199],
  liability: [2200, 2399],
  equity: [2400, 2499],
};

export const CATEGORY_LABELS: Record<AccountCategory, string> = {
  revenue: "Revenue",
  expense: "Expense",
  asset: "Asset",
  liability: "Liability",
  equity: "Equity",
};

export const CATEGORY_ORDER: AccountCategory[] = [
  "revenue",
  "expense",
  "asset",
  "liability",
  "equity",
];

// Inventory account — journal entries touching this account are
// always routed to 'pending' regardless of who submits them.
export const INVENTORY_ACCOUNT_CODE = "2020";

export function codeMatchesCategory(code: string, category: AccountCategory): boolean {
  const numeric = Number(code);
  if (!Number.isInteger(numeric)) return false;
  const [min, max] = CATEGORY_RANGES[category];
  return numeric >= min && numeric <= max;
}

export function validateAccountCode(code: string, category: AccountCategory): string | null {
  if (!/^\d+$/.test(code.trim())) {
    return "Code must be numeric.";
  }
  if (!codeMatchesCategory(code.trim(), category)) {
    const [min, max] = CATEGORY_RANGES[category];
    return `${CATEGORY_LABELS[category]} accounts must have a code between ${min} and ${max}.`;
  }
  return null;
}
