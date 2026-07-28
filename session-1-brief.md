# Session 1 brief — Aikama Ledger foundation

Paste this whole file as your first message to Claude Code. It has everything it needs to avoid wasted back-and-forth.

## What this is
An accounting system for a catering business (Aikama Investment Ltd, Tanzania). Every transaction is a balanced double-entry journal entry; trial balance, P&L, and balance sheet are computed reports over that journal — never separately maintained.

## Stack
- Next.js (App Router) + TypeScript
- Supabase (Postgres + Auth) — free tier
- Tailwind CSS
- Deploy target: Vercel (free tier)

## Task for this session
1. Scaffold a new Next.js + TypeScript + Tailwind project.
2. Set up a Supabase project (guide me through creating the free account and project if I haven't already) and run the attached `schema.sql` against it.
3. Set up Supabase client + basic email/password auth, with a `users` table row created on signup that defaults role to `staff` (I'll manually promote my own account to `owner` in the Supabase table editor).
4. Build these pages, reading/writing only through Supabase, nothing hardcoded:
   - `/accounts` — list chart of accounts grouped by category (revenue/expense/asset/liability/equity), with an "add account" form that validates the code falls in the right numeric range for its category (same ranges as the schema's check constraint).
   - `/journal/new` — journal entry form: date, description, dynamic add/remove line rows (account dropdown, debit, credit). Block submission unless total debits = total credits and there are at least 2 lines. If the logged-in user's role is `staff`, or any line touches account 2020 (Inventory), insert the entry with status `pending` instead of `posted`.
   - `/approvals` — list all `pending` journal_entries (owner only), each showing its lines, with Approve (sets status to `posted`) and Reject buttons. Use the same balance check the schema enforces — don't just trust the UI.
   - `/reports` — three tabs: Trial Balance, Profit & Loss, Balance Sheet. Add a date range picker (default: current month). Call the `get_ledger_summary(start, end)` Postgres function for all three — they're the same underlying data, just filtered/displayed differently per the comments in schema.sql. Balance sheet should also show a computed "Net profit (this period)" line under Equity, equal to the P&L's revenue-minus-expense for the same range.
5. Basic nav bar showing the logged-in user's name and role.

## Explicitly out of scope for this session (later sessions)
Payroll module, inventory request/approve workflow beyond the generic approval queue, period locking, payslip PDF generation.

## Constraints
- Use Sonnet, keep the session focused on the above — don't refactor or gold-plate beyond what's asked.
- Ask me before spending time on anything not listed above.
