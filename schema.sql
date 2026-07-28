-- ============================================================
-- AIKAMA LEDGER — Core database schema
-- Postgres / Supabase
-- ============================================================
-- Design principle: no table stores a "balance". Every balance
-- (trial balance, P&L, balance sheet) is computed on the fly
-- from journal_lines. This is what keeps the books provably
-- consistent — there is nowhere to "edit a balance" directly.
-- ============================================================

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ------------------------------------------------------------
-- USERS & ROLES
-- ------------------------------------------------------------
create table users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text unique not null,
  role text not null check (role in ('owner', 'staff')),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- CHART OF ACCOUNTS
-- 1000-1399 revenue | 1400-1999 expense
-- 2000-2199 asset   | 2200-2399 liability | 2400-2499 equity
-- ------------------------------------------------------------
create table accounts (
  code text primary key,
  name text not null,
  category text not null check (category in ('revenue', 'expense', 'asset', 'liability', 'equity')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint code_matches_category check (
    (category = 'revenue'   and code::int between 1000 and 1399) or
    (category = 'expense'   and code::int between 1400 and 1999) or
    (category = 'asset'     and code::int between 2000 and 2199) or
    (category = 'liability' and code::int between 2200 and 2399) or
    (category = 'equity'    and code::int between 2400 and 2499)
  )
);

insert into accounts (code, name, category) values
  ('1000', 'Catering Revenue', 'revenue'),
  ('1400', 'Transport - Air Travel', 'expense'),
  ('1401', 'Transport - Train Travel', 'expense'),
  ('1402', 'Transport - Taxi', 'expense'),
  ('1410', 'Nyama (Meat) Purchases', 'expense'),
  ('1411', 'Mchele (Rice) Purchases', 'expense'),
  ('1420', 'Handling & Materials', 'expense'),
  ('1430', 'NSSF Employer Contribution', 'expense'),
  ('1440', 'SDL Expense', 'expense'),
  ('2000', 'Bank Account', 'asset'),
  ('2010', 'Petty Cash', 'asset'),
  ('2020', 'Inventory', 'asset'),
  ('2200', 'NSSF Payable', 'liability'),          -- combined employee + employer share, one remittance
  ('2210', 'PAYE Payable', 'liability'),
  ('2220', 'Supplier Control Account', 'liability'),
  ('2400', 'Owner''s Equity', 'equity');

-- ------------------------------------------------------------
-- JOURNAL — the single source of truth for every balance
-- ------------------------------------------------------------
create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null,
  description text not null,
  status text not null default 'pending' check (status in ('posted', 'pending', 'rejected')),
  created_by uuid not null references users(id),
  approved_by uuid references users(id),
  source text not null default 'manual' check (source in ('manual', 'payroll', 'inventory')),
  created_at timestamptz not null default now()
);

create table journal_lines (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references journal_entries(id) on delete cascade,
  account_code text not null references accounts(code),
  debit numeric(14, 2) not null default 0 check (debit >= 0),
  credit numeric(14, 2) not null default 0 check (credit >= 0),
  constraint one_side_only check (not (debit > 0 and credit > 0)),
  constraint nonzero_line check (debit > 0 or credit > 0)
);

create index idx_journal_lines_account on journal_lines(account_code);
create index idx_journal_lines_entry on journal_lines(entry_id);
create index idx_journal_entries_date on journal_entries(entry_date);

-- Enforce: an entry can only be marked 'posted' if its lines balance
create or replace function check_entry_balances() returns trigger as $$
declare
  total_debit numeric;
  total_credit numeric;
begin
  if new.status = 'posted' then
    select coalesce(sum(debit), 0), coalesce(sum(credit), 0)
      into total_debit, total_credit
      from journal_lines where entry_id = new.id;
    if total_debit <> total_credit then
      raise exception 'Cannot post entry %: debits (%) do not equal credits (%)', new.id, total_debit, total_credit;
    end if;
    if total_debit = 0 then
      raise exception 'Cannot post entry %: entry has no lines', new.id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_check_entry_balances
  before update of status on journal_entries
  for each row execute function check_entry_balances();

-- ------------------------------------------------------------
-- PERIOD LOCKS — prevent editing a month after it's finalized
-- ------------------------------------------------------------
create table period_locks (
  period_start date primary key,
  period_end date not null,
  locked_by uuid references users(id),
  locked_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- EMPLOYEES & PAYROLL
-- ------------------------------------------------------------
create table employees (
  id uuid primary key default gen_random_uuid(),
  serial_number int,
  full_name text not null,
  tin text,
  nssf_number text,
  employment_type text not null check (employment_type in ('permanent', 'casual')),
  start_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table payroll_runs (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  status text not null default 'draft' check (status in ('draft', 'finalized')),
  created_by uuid not null references users(id),
  finalized_at timestamptz
);

create table payslips (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references payroll_runs(id) on delete cascade,
  employee_id uuid not null references employees(id),
  basic_salary numeric(14, 2) not null default 0,
  allowances numeric(14, 2) not null default 0,
  gross_salary numeric(14, 2) not null,
  paye numeric(14, 2) not null default 0,
  nssf_employee numeric(14, 2) not null default 0,
  nssf_employer numeric(14, 2) not null default 0,
  sdl numeric(14, 2) not null default 0,
  net_salary numeric(14, 2) not null,
  journal_entry_id uuid references journal_entries(id) -- set once the run is finalized & auto-posted
);

-- ------------------------------------------------------------
-- INVENTORY — request -> approve -> receive/issue
-- ------------------------------------------------------------
create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text not null,
  quantity_on_hand numeric(14, 2) not null default 0
);

create table inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references inventory_items(id),
  quantity numeric(14, 2) not null check (quantity > 0),
  unit_cost numeric(14, 2),
  type text not null check (type in ('receive', 'issue')),
  requested_by uuid not null references users(id),
  approved_by uuid references users(id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  journal_entry_id uuid references journal_entries(id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- THE REPORTING ENGINE
-- One function powers trial balance, P&L, and balance sheet.
--
-- Balance sheet accounts (asset/liability/equity): cumulative
--   from the beginning of time up to p_period_end. They never
--   reset — this mirrors a paper ledger's "balance b/f".
-- P&L accounts (revenue/expense): only entries dated within
--   [p_period_start, p_period_end]. These conceptually "close"
--   at the end of each period, same as ruling off a paper
--   ledger page — but here it's just a date filter, nothing
--   is ever deleted or zeroed in the database.
-- ============================================================
create or replace function get_ledger_summary(p_period_start date, p_period_end date)
returns table (
  code text,
  name text,
  category text,
  debit numeric,
  credit numeric
) language sql stable as $$
  select
    a.code,
    a.name,
    a.category,
    coalesce(sum(jl.debit), 0) as debit,
    coalesce(sum(jl.credit), 0) as credit
  from accounts a
  left join journal_lines jl on jl.account_code = a.code
  left join journal_entries je
    on je.id = jl.entry_id
   and je.status = 'posted'
   and je.entry_date <= p_period_end
   and (
     a.category in ('asset', 'liability', 'equity')
     or je.entry_date >= p_period_start
   )
  group by a.code, a.name, a.category
  order by a.code;
$$;

-- Example usage once this is loaded into Supabase:
--   select * from get_ledger_summary('2026-07-01', '2026-07-31');  -- trial balance for July
--   select * from get_ledger_summary('2026-01-01', '2026-07-31');  -- year-to-date P&L, same-day balance sheet
