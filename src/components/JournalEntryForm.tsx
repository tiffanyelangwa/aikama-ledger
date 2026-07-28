"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { INVENTORY_ACCOUNT_CODE } from "@/lib/accounts";
import type { Account, UserProfile } from "@/types/database";

interface Line {
  accountCode: string;
  debit: string;
  credit: string;
}

function emptyLine(): Line {
  return { accountCode: "", debit: "", credit: "" };
}

// Compare in integer cents to avoid floating point drift.
function toCents(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export default function JournalEntryForm({
  accounts,
  profile,
}: {
  accounts: Account[];
  profile: UserProfile;
}) {
  const router = useRouter();
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine(), emptyLine()]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(index: number) {
    setLines((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== index)));
  }

  const totalDebit = lines.reduce((sum, l) => sum + toCents(l.debit), 0);
  const totalCredit = lines.reduce((sum, l) => sum + toCents(l.credit), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  function validate(): string | null {
    if (!description.trim()) return "Description is required.";
    if (lines.length < 2) return "At least two lines are required.";

    for (const [i, line] of lines.entries()) {
      if (!line.accountCode) return `Line ${i + 1}: select an account.`;
      const debitCents = toCents(line.debit);
      const creditCents = toCents(line.credit);
      if (debitCents > 0 && creditCents > 0) {
        return `Line ${i + 1}: enter either a debit or a credit, not both.`;
      }
      if (debitCents === 0 && creditCents === 0) {
        return `Line ${i + 1}: enter a nonzero debit or credit.`;
      }
    }

    if (totalDebit !== totalCredit) {
      return `Total debits (${(totalDebit / 100).toFixed(2)}) must equal total credits (${(
        totalCredit / 100
      ).toFixed(2)}).`;
    }
    if (totalDebit === 0) return "Entry cannot be all zero.";

    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    const touchesInventory = lines.some((l) => l.accountCode === INVENTORY_ACCOUNT_CODE);
    const canAutoPost = profile.role === "owner" && !touchesInventory;

    // Always insert as 'pending' first, with lines, so the
    // trg_check_entry_balances trigger validates the balance on the
    // follow-up status update rather than being skipped on insert.
    const { data: entry, error: entryError } = await supabase
      .from("journal_entries")
      .insert({
        entry_date: entryDate,
        description: description.trim(),
        status: "pending",
        created_by: profile.id,
        source: "manual",
      })
      .select("id")
      .single();

    if (entryError || !entry) {
      setError(entryError?.message ?? "Failed to create entry.");
      setSubmitting(false);
      return;
    }

    const { error: linesError } = await supabase.from("journal_lines").insert(
      lines.map((l) => ({
        entry_id: entry.id,
        account_code: l.accountCode,
        debit: toCents(l.debit) / 100,
        credit: toCents(l.credit) / 100,
      }))
    );

    if (linesError) {
      await supabase.from("journal_entries").delete().eq("id", entry.id);
      setError(linesError.message);
      setSubmitting(false);
      return;
    }

    if (canAutoPost) {
      const { error: postError } = await supabase
        .from("journal_entries")
        .update({ status: "posted", approved_by: profile.id })
        .eq("id", entry.id);

      if (postError) {
        setError(`Entry saved as pending — could not auto-post: ${postError.message}`);
        setSubmitting(false);
        return;
      }
    }

    setNotice(canAutoPost ? "Entry posted." : "Entry submitted for approval.");
    setDescription("");
    setLines([emptyLine(), emptyLine()]);
    setSubmitting(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Date</label>
          <input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-gray-500">
              <th className="px-3 py-2 font-medium">Account</th>
              <th className="px-3 py-2 font-medium">Debit</th>
              <th className="px-3 py-2 font-medium">Credit</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="border-t border-gray-50">
                <td className="px-3 py-2">
                  <select
                    value={line.accountCode}
                    onChange={(e) => updateLine(i, { accountCode: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                  >
                    <option value="">Select account</option>
                    {accounts.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.code} — {a.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.debit}
                    onChange={(e) => updateLine(i, { debit: e.target.value, credit: "" })}
                    className="w-28 rounded border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.credit}
                    onChange={(e) => updateLine(i, { credit: e.target.value, debit: "" })}
                    className="w-28 rounded border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    disabled={lines.length <= 2}
                    className="text-xs text-gray-400 hover:text-red-600 disabled:opacity-30"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-100 font-medium">
              <td className="px-3 py-2 text-gray-500">Totals</td>
              <td className="px-3 py-2">{(totalDebit / 100).toFixed(2)}</td>
              <td className="px-3 py-2">{(totalCredit / 100).toFixed(2)}</td>
              <td className="px-3 py-2">
                <span className={isBalanced ? "text-green-600 text-xs" : "text-amber-600 text-xs"}>
                  {isBalanced ? "Balanced" : "Not balanced"}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
        <div className="border-t border-gray-100 px-3 py-2">
          <button
            type="button"
            onClick={addLine}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            + Add line
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {notice && <p className="text-sm text-green-600">{notice}</p>}

      <button
        type="submit"
        disabled={submitting || !isBalanced}
        className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "Submit entry"}
      </button>
    </form>
  );
}
