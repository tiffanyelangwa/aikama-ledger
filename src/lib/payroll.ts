import { createClient } from "@/lib/supabase/server";
import { PAYROLL_ACCOUNTS, resolvePayrollAccounts, buildPayrollJournal } from "@/lib/payroll-journal";
import { monthRange } from "@/lib/ledger";

export async function finalizePayroll(payrollRunId: string, userId: string) {
  const supabase = await createClient();
  const { data: accounts, error: accountsError } = await supabase
    .from("accounts")
    .select("code, category, active")
    .in("code", Object.values(PAYROLL_ACCOUNTS).flatMap((m) => m.code ? [m.code] : []));
  if (accountsError) throw new Error(`Cannot validate payroll accounts: ${accountsError.message}. Missing mappings: Salary Expense, SDL Payable, Salary Payable. No journal was created.`);
  // Phase 1 stops here until all three missing mappings are explicitly configured.
  const codes = resolvePayrollAccounts(accounts ?? []);

  const { data: run, error: runError } = await supabase.from("payroll_runs").select("*").eq("id", payrollRunId).single();
  if (runError || !run) throw new Error(`Cannot load payroll run: ${runError?.message ?? "not found"}`);
  if (run.status !== "draft" || run.journal_entry_id) throw new Error("Payroll is not an unposted draft; inspect its existing journal before retrying.");
  const period = monthRange(Number(run.year), Number(run.month));
  if (run.period_end !== period.end) throw new Error("Payroll period end does not match its month/year; no journal was created.");

  const { data: slips, error: slipsError } = await supabase.from("payslips").select("*").eq("run_id", payrollRunId);
  if (slipsError) throw new Error(`Cannot load payslips: ${slipsError.message}`);
  const lines = buildPayrollJournal(slips ?? [], codes);

  // Existing non-atomic lifecycle, unreachable while required mappings are missing.
  const { data: entry, error: entryError } = await supabase.from("journal_entries").insert({
    entry_date: run.period_end, description: `Payroll ${run.month}/${run.year}`,
    source: "payroll", status: "pending", created_by: userId,
  }).select("id").single();
  if (entryError || !entry) throw new Error(`Cannot create payroll journal: ${entryError?.message ?? "no entry returned"}`);
  const { error: lineError } = await supabase.from("journal_lines").insert(lines.map((line) => ({ ...line, entry_id: entry.id })));
  if (lineError) throw new Error(`Journal ${entry.id} remains pending: ${lineError.message}. Do not retry; inspect this entry first.`);
  const { data: posted, error: postError } = await supabase.from("journal_entries")
    .update({ status: "posted", approved_by: userId }).eq("id", entry.id).eq("status", "pending").select("id").single();
  if (postError || !posted) throw new Error(`Journal ${entry.id} could not be posted: ${postError?.message ?? "no row updated"}. Do not retry; inspect this entry first.`);
  const { data: finalized, error: finalError } = await supabase.from("payroll_runs")
    .update({ status: "finalized", finalized_at: new Date().toISOString(), journal_entry_id: entry.id })
    .eq("id", payrollRunId).eq("status", "draft").select("id").single();
  if (finalError || !finalized) throw new Error(`Journal ${entry.id} posted, but payroll finalization failed: ${finalError?.message ?? "no row updated"}. Do not retry; reconcile the journal linkage first.`);
  return posted;
}
