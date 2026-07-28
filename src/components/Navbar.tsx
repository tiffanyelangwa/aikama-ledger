"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/types/database";

export default function Navbar({
  profile,
  hasSession,
}: {
  profile: UserProfile | null;
  hasSession: boolean;
}) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold text-gray-900">
            Aikama Ledger
          </Link>
          {profile && (
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <Link href="/accounts" className="hover:text-gray-900">
                Accounts
              </Link>
              <Link href="/journal/new" className="hover:text-gray-900">
                New Entry
              </Link>
              {profile.role === "owner" && (
                <Link href="/approvals" className="hover:text-gray-900">
                  Approvals
                </Link>
              )}
              <Link href="/reports" className="hover:text-gray-900">
                Reports
              </Link>
              <Link href="/payroll" className="hover:text-gray-900">
                Payroll
              </Link>
            </div>
          )}
        </div>
        {hasSession && (
          <div className="flex items-center gap-3 text-sm">
            {profile ? (
              <span className="text-gray-700">
                {profile.full_name}{" "}
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium uppercase text-gray-500">
                  {profile.role}
                </span>
              </span>
            ) : (
              <span className="text-xs text-amber-600">Profile setup incomplete</span>
            )}
            <button
              onClick={handleSignOut}
              className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
