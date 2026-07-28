import { createClient } from "@/lib/supabase/server";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/accounts";
import type { Account, AccountCategory } from "@/types/database";
import AddAccountForm from "@/components/AddAccountForm";

export default async function AccountsPage() {
  const supabase = await createClient();
  const { data: accounts, error } = await supabase
    .from("accounts")
    .select("code, name, category, active, created_at")
    .order("code");

  const grouped: Record<AccountCategory, Account[]> = {
    revenue: [],
    expense: [],
    asset: [],
    liability: [],
    equity: [],
  };
  for (const account of (accounts ?? []) as Account[]) {
    grouped[account.category].push(account);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Chart of Accounts</h1>

      {error && (
        <p className="mt-4 text-sm text-red-600">
          Failed to load accounts: {error.message}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {CATEGORY_ORDER.map((category) => (
            <div key={category} className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-4 py-2">
                <h2 className="text-sm font-semibold text-gray-700">
                  {CATEGORY_LABELS[category]}
                </h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="px-4 py-2 font-medium">Code</th>
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped[category].length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-gray-400">
                        No accounts yet.
                      </td>
                    </tr>
                  )}
                  {grouped[category].map((account) => (
                    <tr key={account.code} className="border-t border-gray-50">
                      <td className="px-4 py-2 font-mono text-gray-600">
                        {account.code}
                      </td>
                      <td className="px-4 py-2 text-gray-900">{account.name}</td>
                      <td className="px-4 py-2 text-gray-500">
                        {account.active ? "Yes" : "No"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <div>
          <AddAccountForm />
        </div>
      </div>
    </div>
  );
}
