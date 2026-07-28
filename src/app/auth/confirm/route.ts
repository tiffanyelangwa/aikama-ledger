import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureProfileRow } from "@/lib/profile";

// Handles the link from Supabase's "Confirm signup" email template, which
// must be customized to point here (see schema_rls.sql comments / setup
// notes) instead of Supabase's own hosted verify endpoint. Verifying here
// lets us use our server client so the session cookie is set correctly,
// and lets us create the public.users profile row right after — the
// profile can't be created before this point because RLS requires an
// authenticated session (id = auth.uid()), which doesn't exist until the
// email is confirmed.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { error: profileError } = await ensureProfileRow(supabase, user);
        if (profileError) {
          console.error("[/auth/confirm] failed to create profile row:", profileError);
        }
      }

      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL("/login?error=confirmation_failed", request.url));
}
