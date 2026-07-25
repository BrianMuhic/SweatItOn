import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PasswordInput } from "@/components/password-input";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  return <LoginForm searchParams={searchParams} />;
}

async function LoginForm({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;

  async function login(formData: FormData) {
    "use server";
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");
    const next = String(formData.get("next") || "/dashboard");

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      redirect(`/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
    }
    redirect(next);
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-5 py-10">
      <h1 className="font-[family-name:var(--font-display)] text-5xl tracking-wide">
        Log in
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        No account?{" "}
        <Link href="/signup" className="text-[var(--accent)]">
          Sign up
        </Link>
      </p>
      {params.error ? (
        <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {params.error}
        </p>
      ) : null}
      <form action={login} className="mt-8 space-y-4">
        <input type="hidden" name="next" value={params.next || "/dashboard"} />
        <label className="block space-y-2 text-sm">
          <span className="text-[var(--muted)]">Email</span>
          <input className="field" type="email" name="email" required />
        </label>
        <label className="block space-y-2 text-sm">
          <span className="text-[var(--muted)]">Password</span>
          <PasswordInput name="password" required autoComplete="current-password" />
        </label>
        <button
          type="submit"
          className="w-full rounded-full bg-[var(--accent)] px-5 py-3 font-bold text-[var(--bg)]"
        >
          Log in
        </button>
      </form>
    </div>
  );
}
