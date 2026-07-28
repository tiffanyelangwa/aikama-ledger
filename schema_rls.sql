-- ============================================================
-- AIKAMA LEDGER — Row Level Security policies
-- Run this AFTER schema.sql.
--
-- Design: the app always INSERTs journal_entries as 'pending'
-- (with their lines), then issues a follow-up UPDATE to flip
-- status to 'posted' when the submitter is an owner and no
-- line touches an inventory-tracked account. This ensures the
-- existing trg_check_entry_balances trigger (which only fires
-- on UPDATE OF status) always runs before anything is posted —
-- both for direct owner submissions and for approvals.
-- ============================================================

alter table users enable row level security;
alter table accounts enable row level security;
alter table journal_entries enable row level security;
alter table journal_lines enable row level security;

-- Tables not used by the app this session — RLS enabled, no
-- policies, so they are fully inaccessible via the API until a
-- later session adds policies for them.
alter table period_locks enable row level security;
alter table employees enable row level security;
alter table payroll_runs enable row level security;
alter table payslips enable row level security;
alter table inventory_items enable row level security;
alter table inventory_transactions enable row level security;

-- ------------------------------------------------------------
-- USERS
-- ------------------------------------------------------------
-- Any signed-in user can read the team roster (needed for nav,
-- "created by" display, and role lookups used by other policies).
create policy users_select_authenticated on users
  for select to authenticated
  using (true);

-- A user may only ever create their OWN row, and only as 'staff'.
-- This is what stops a client from self-promoting to 'owner' at
-- signup; promotion to owner is done manually in the table editor.
create policy users_insert_self_as_staff on users
  for insert to authenticated
  with check (id = auth.uid() and role = 'staff');

-- ------------------------------------------------------------
-- ACCOUNTS
-- ------------------------------------------------------------
create policy accounts_select_authenticated on accounts
  for select to authenticated
  using (true);

create policy accounts_insert_authenticated on accounts
  for insert to authenticated
  with check (true);

-- ------------------------------------------------------------
-- JOURNAL ENTRIES
-- ------------------------------------------------------------
create policy journal_entries_select_authenticated on journal_entries
  for select to authenticated
  using (true);

-- Every insert must be the caller's own entry, and must start
-- 'pending' — nothing is ever inserted directly as 'posted'.
create policy journal_entries_insert_own_pending on journal_entries
  for insert to authenticated
  with check (created_by = auth.uid() and status = 'pending');

-- Only owners may transition status (pending -> posted/rejected).
-- This covers both self-posting (owner submits a normal entry)
-- and approving/rejecting entries submitted by staff.
create policy journal_entries_update_owner_only on journal_entries
  for update to authenticated
  using (exists (select 1 from users u where u.id = auth.uid() and u.role = 'owner'))
  with check (exists (select 1 from users u where u.id = auth.uid() and u.role = 'owner'));

-- ------------------------------------------------------------
-- JOURNAL LINES
-- ------------------------------------------------------------
create policy journal_lines_select_authenticated on journal_lines
  for select to authenticated
  using (true);

-- Lines may only be added to an entry the caller owns while it
-- is still pending (i.e. before it's been posted or rejected).
create policy journal_lines_insert_own_pending_entry on journal_lines
  for insert to authenticated
  with check (
    exists (
      select 1 from journal_entries je
      where je.id = entry_id
        and je.created_by = auth.uid()
        and je.status = 'pending'
    )
  );
