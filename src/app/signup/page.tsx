import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PasswordInput } from "@/components/password-input";

export default function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return <SignupForm searchParams={searchParams} />;
}

async function SignupForm({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  async function signup(formData: FormData) {
    "use server";
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");
    const displayName = String(formData.get("display_name") || "").trim();

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName || undefined },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    if (error) {
      redirect(`/signup?error=${encodeURIComponent(error.message)}`);
    }

    // If email confirmation is required, no session is returned yet.
    if (!data.session) {
      redirect(
        `/login?error=${encodeURIComponent(
          "Account created. Confirm your email (or disable Confirm email in Supabase Auth), then log in.",
        )}`,
      );
    }

    redirect("/connect");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-5 py-10">
      <h1 className="font-[family-name:var(--font-display)] text-5xl tracking-wide">
        Sign up
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        Already rivaling?{" "}
        <Link href="/login" className="text-[var(--accent)]">
          Log in
        </Link>
      </p>
      {params.error ? (
        <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {params.error}
        </p>
      ) : null}
      <form action={signup} className="mt-8 space-y-4">
        <label className="block space-y-2 text-sm">
          <span className="text-[var(--muted)]">Display name</span>
          <input className="field" type="text" name="display_name" required />
        </label>
        <label className="block space-y-2 text-sm">
          <span className="text-[var(--muted)]">Email</span>
          <input className="field" type="email" name="email" required />
        </label>
        <label className="block space-y-2 text-sm">
          <span className="text-[var(--muted)]">Password</span>
          <PasswordInput
            name="password"
            minLength={6}
            required
            autoComplete="new-password"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-full bg-[var(--accent)] px-5 py-3 font-bold text-[var(--bg)]"
        >
          Create account
        </button>
      </form>
    </div>
  );
}
