import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import type { Account } from "@/types/database";
import JournalEntryForm from "@/components/JournalEntryForm";

export default async function NewJournalEntryPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: accounts } = await supabase
    .from("accounts")
    .select("code, name, category, active, created_at")
    .eq("active", true)
    .order("code");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">New Journal Entry</h1>
      <p className="mt-1 text-sm text-gray-500">
        {profile.role === "staff"
          ? "Entries you submit go to the owner for approval."
          : "Entries touching Inventory (2020) go to approval; others post immediately."}
      </p>

      <div className="mt-6">
        <JournalEntryForm accounts={(accounts ?? []) as Account[]} profile={profile} />
      </div>
    </div>
  );
}
