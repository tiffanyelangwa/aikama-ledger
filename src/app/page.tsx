import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";

export default async function HomePage() {
  const profile = await getCurrentProfile();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">
        Welcome{profile ? `, ${profile.full_name}` : ""}
      </h1>
      <p className="mt-2 text-gray-600">Aikama Investment Ltd — bookkeeping</p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/accounts"
          className="rounded-lg border border-gray-200 bg-white p-5 hover:border-gray-300"
        >
          <h2 className="font-medium text-gray-900">Chart of Accounts</h2>
          <p className="mt-1 text-sm text-gray-500">View and add accounts</p>
        </Link>
        <Link
          href="/journal/new"
          className="rounded-lg border border-gray-200 bg-white p-5 hover:border-gray-300"
        >
          <h2 className="font-medium text-gray-900">New Journal Entry</h2>
          <p className="mt-1 text-sm text-gray-500">Record a transaction</p>
        </Link>
        {profile?.role === "owner" && (
          <Link
            href="/approvals"
            className="rounded-lg border border-gray-200 bg-white p-5 hover:border-gray-300"
          >
            <h2 className="font-medium text-gray-900">Approvals</h2>
            <p className="mt-1 text-sm text-gray-500">Review pending entries</p>
          </Link>
        )}
        <Link
          href="/reports"
          className="rounded-lg border border-gray-200 bg-white p-5 hover:border-gray-300"
        >
          <h2 className="font-medium text-gray-900">Reports</h2>
          <p className="mt-1 text-sm text-gray-500">
            Trial balance, P&amp;L, balance sheet
          </p>
        </Link>
      </div>
    </div>
  );
}
