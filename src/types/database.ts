export type Role = "owner" | "staff";

export type AccountCategory = "revenue" | "expense" | "asset" | "liability" | "equity";

export type JournalEntryStatus = "posted" | "pending" | "rejected";

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  created_at: string;
}

export interface Account {
  code: string;
  name: string;
  category: AccountCategory;
  active: boolean;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  entry_date: string;
  description: string;
  status: JournalEntryStatus;
  created_by: string;
  approved_by: string | null;
  source: "manual" | "payroll" | "inventory";
  created_at: string;
}

export interface JournalLine {
  id: string;
  entry_id: string;
  account_code: string;
  debit: number;
  credit: number;
}

export interface LedgerSummaryRow {
  code: string;
  name: string;
  category: AccountCategory;
  debit: number;
  credit: number;
}
