import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import type { JournalEntry, JournalLine, Account } from "@/types/database";
import ApprovalCard from "@/components/ApprovalCard";

export interface PendingEntry extends JournalEntry {
  journal_lines: JournalLine[];
  created_by_profile: { full_name: string } | null;
}

export default async function ApprovalsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "owner") {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Approvals</h1>
        <p className="mt-4 text-sm text-gray-500">Only owners can view approvals.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: entries, error }, { data: accounts }] = await Promise.all([
    supabase
      .from("journal_entries")
      .select(
        "id, entry_date, description, status, created_by, approved_by, source, created_at, journal_lines(id, entry_id, account_code, debit, credit), created_by_profile:users!journal_entries_created_by_fkey(full_name)"
      )
      .eq("status", "pending")
      .order("entry_date", { ascending: false }),
    supabase.from("accounts").select("code, name, category, active, created_at"),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Approvals</h1>
      <p className="mt-1 text-sm text-gray-500">
        Pending journal entries awaiting review.
      </p>

      {error && (
        <p className="mt-4 text-sm text-red-600">
          Failed to load pending entries: {error.message}
        </p>
      )}

      <div className="mt-6 space-y-4">
        {(!entries || entries.length === 0) && (
          <p className="text-sm text-gray-400">No pending entries.</p>
        )}
        {(entries as unknown as PendingEntry[] | null)?.map((entry) => (
          <ApprovalCard
            key={entry.id}
            entry={entry}
            accounts={(accounts ?? []) as Account[]}
          />
        ))}
      </div>
    </div>
  );
}
