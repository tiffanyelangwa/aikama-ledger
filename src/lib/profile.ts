import type { SupabaseClient, User } from "@supabase/supabase-js";

// Creates the public.users profile row for a confirmed auth user, if it
// doesn't already exist. Called both right after email confirmation
// (src/app/auth/confirm/route.ts) and defensively on sign-in, in case
// that first attempt failed for any reason.
export async function ensureProfileRow(
  supabase: SupabaseClient,
  user: User
): Promise<{ error: string | null }> {
  const fullName =
    (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "New user";

  const { error } = await supabase.from("users").insert({
    id: user.id,
    full_name: fullName,
    email: user.email!,
    role: "staff",
  });

  // 23505 = unique_violation — the row already exists, which is fine.
  if (error && error.code !== "23505") {
    return { error: error.message };
  }
  return { error: null };
}
