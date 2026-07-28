"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ensureProfileRow } from "@/lib/profile";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // This project's confirmation emails redirect here with a PKCE `?code=`
  // param (rather than hitting src/app/auth/confirm/route.ts, which
  // expects the token_hash flow) — so the exchange has to happen
  // wherever Supabase actually sends the user, not wherever we'd prefer.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const errorDescription = params.get("error_description");

    if (errorDescription) {
      setError(errorDescription.replace(/\+/g, " "));
      window.history.replaceState({}, "", "/login");
      return;
    }

    if (!code) return;

    (async () => {
      setConfirming(true);
      const supabase = createClient();
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      window.history.replaceState({}, "", "/login");

      if (exchangeError) {
        setError(exchangeError.message);
        setConfirming(false);
        return;
      }

      if (data.user) {
        const { error: profileError } = await ensureProfileRow(supabase, data.user);
        if (profileError) {
          setError(`Confirmed, but couldn't set up your profile: ${profileError}`);
          setConfirming(false);
          return;
        }
      }

      router.push("/");
      router.refresh();
    })();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === "signup") {
        // full_name is stashed in auth user metadata — the public.users
        // profile row can't be created yet because RLS requires an
        // authenticated session (id = auth.uid()), which doesn't exist
        // until the confirmation link is clicked. See
        // src/app/auth/confirm/route.ts, which creates the row once the
        // account is actually confirmed and a session exists.
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (signUpError) throw signUpError;

        if (!data.session) {
          setNotice("Check your email to confirm your account, then sign in.");
          setLoading(false);
          return;
        }
        // Email confirmation is disabled for this project, so signUp()
        // already returned a live session — create the profile row now
        // since there's no confirmation-link round trip to do it.
        const { error: profileError } = await ensureProfileRow(supabase, data.user!);
        if (profileError) throw new Error(profileError);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;

        // Defensive fallback: if confirmation happened but the profile
        // row somehow never got created, repair it now rather than
        // leaving the account stuck.
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { error: profileError } = await ensureProfileRow(supabase, user);
          if (profileError) {
            throw new Error(`Signed in, but couldn't set up your profile: ${profileError}`);
          }
        }
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (confirming) {
    return (
      <div className="mx-auto mt-16 max-w-sm">
        <h1 className="text-xl font-semibold text-gray-900">Confirming your account...</h1>
        <p className="mt-1 text-sm text-gray-500">Aikama Ledger</p>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-16 max-w-sm">
      <h1 className="text-xl font-semibold text-gray-900">
        {mode === "signin" ? "Sign in" : "Create an account"}
      </h1>
      <p className="mt-1 text-sm text-gray-500">Aikama Ledger</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {mode === "signup" && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Full name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {notice && <p className="text-sm text-green-600">{notice}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Sign up"}
        </button>
      </form>

      <button
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
        }}
        className="mt-4 text-sm text-gray-500 hover:text-gray-700"
      >
        {mode === "signin"
          ? "Need an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
