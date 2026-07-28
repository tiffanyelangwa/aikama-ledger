import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/types/database";

// Returns the signed-in Supabase auth user together with their
// public.users profile row (full_name, role). Null if not signed in
// or the profile row hasn't been created yet.
export async function getCurrentProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id, full_name, email, role, created_at")
    .eq("id", user.id)
    .single();

  return profile;
}

// Whether there's a signed-in auth user at all, regardless of whether
// their public.users profile row exists yet. Used by the nav bar so a
// signed-in user whose profile row is missing can still see a "Sign
// out" option instead of being stuck with no way back to /login.
export async function hasAuthSession(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user !== null;
}
