"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Account } from "@/types/database";
import type { PendingEntry } from "@/app/approvals/page";

function accountLabel(accounts: Account[], code: string): string {
  const account = accounts.find((a) => a.code === code);
  return account ? `${account.code} — ${account.name}` : code;
}

export default function ApprovalCard({
  entry,
  accounts,
}: {
  entry: PendingEntry;
  accounts: Account[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const totalDebit = entry.journal_lines.reduce((sum, l) => sum + Number(l.debit), 0);
  const totalCredit = entry.journal_lines.reduce((sum, l) => sum + Number(l.credit), 0);
  // Same check the schema's trg_check_entry_balances trigger performs —
  // computed here too so the UI doesn't just trust that the entry is
  // approvable; the trigger still re-verifies server-side on the update.
  const isBalanced =
    Math.round(totalDebit * 100) === Math.round(totalCredit * 100) && totalDebit > 0;

  async function handleApprove() {
    setError(null);
    if (!isBalanced) {
      setError("Cannot approve: debits and credits do not balance.");
      return;
    }
    setBusy(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: updateError } = await supabase
      .from("journal_entries")
      .update({ status: "posted", approved_by: user?.id ?? null })
      .eq("id", entry.id);

    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.refresh();
  }

  async function handleReject() {
    setError(null);
    setBusy(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: updateError } = await supabase
      .from("journal_entries")
      .update({ status: "rejected", approved_by: user?.id ?? null })
      .eq("id", entry.id);

    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-gray-900">{entry.description}</p>
          <p className="text-xs text-gray-500">
            {entry.entry_date} · submitted by{" "}
            {entry.created_by_profile?.full_name ?? "unknown"} · source: {entry.source}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            disabled={busy || !isBalanced}
            className="rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            Approve
          </button>
          <button
            onClick={handleReject}
            disabled={busy}
            className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      </div>

      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="py-1 font-medium">Account</th>
            <th className="py-1 font-medium">Debit</th>
            <th className="py-1 font-medium">Credit</th>
          </tr>
        </thead>
        <tbody>
          {entry.journal_lines.map((line) => (
            <tr key={line.id} className="border-t border-gray-50">
              <td className="py-1 text-gray-700">
                {accountLabel(accounts, line.account_code)}
              </td>
              <td className="py-1">{Number(line.debit).toFixed(2)}</td>
              <td className="py-1">{Number(line.credit).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-100 font-medium">
            <td className="py-1 text-gray-500">Totals</td>
            <td className="py-1">{totalDebit.toFixed(2)}</td>
            <td className="py-1">{totalCredit.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      {!isBalanced && (
        <p className="mt-2 text-xs text-amber-600">
          Warning: this entry does not balance and cannot be approved.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
