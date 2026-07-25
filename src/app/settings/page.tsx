import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PasswordInput } from "@/components/password-input";
import {
  deleteAccount,
  updateDisplayName,
  updateEmail,
} from "@/lib/actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto max-w-xl px-5 py-10 md:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--lime)]">
        Account
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl tracking-wide">
        Settings
      </h1>
      <p className="mt-3 text-[var(--muted)]">
        Update your username, email, or delete your account.
      </p>

      {params.success ? (
        <p className="mt-4 rounded-xl border border-[var(--lime)]/40 bg-[var(--lime)]/10 px-3 py-2 text-sm text-[var(--lime)]">
          {params.success}
        </p>
      ) : null}
      {params.error ? (
        <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {params.error}
        </p>
      ) : null}

      <section className="panel mt-8 p-5">
        <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
          Username
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Shown on group boards and rivalries.
        </p>
        <form action={updateDisplayName} className="mt-4 space-y-3">
          <input type="hidden" name="next" value="/settings" />
          <label className="block space-y-2 text-sm">
            <span className="text-[var(--muted)]">Username</span>
            <input
              className="field"
              name="display_name"
              defaultValue={profile?.display_name || ""}
              required
              autoComplete="nickname"
            />
          </label>
          <button
            type="submit"
            className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[var(--bg)]"
          >
            Save username
          </button>
        </form>
      </section>

      <section className="panel mt-4 p-5">
        <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
          Email
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Current: {user.email}. Confirm the change from your inbox.
        </p>
        <form action={updateEmail} className="mt-4 space-y-3">
          <label className="block space-y-2 text-sm">
            <span className="text-[var(--muted)]">New email</span>
            <input
              className="field"
              type="email"
              name="email"
              required
              autoComplete="email"
            />
          </label>
          <label className="block space-y-2 text-sm">
            <span className="text-[var(--muted)]">Account password</span>
            <PasswordInput
              name="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button
            type="submit"
            className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[var(--bg)]"
          >
            Update email
          </button>
        </form>
      </section>

      <section className="panel mt-4 border-red-500/30 p-5">
        <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-red-200">
          Delete account
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Permanently removes your profile, Strava connection, group
          memberships, and any groups you own. This cannot be undone.
        </p>
        <form action={deleteAccount} className="mt-4 space-y-3">
          <label className="block space-y-2 text-sm">
            <span className="text-[var(--muted)]">
              Type DELETE to confirm
            </span>
            <input
              className="field"
              name="confirm"
              autoComplete="off"
              required
              placeholder="DELETE"
            />
          </label>
          <label className="block space-y-2 text-sm">
            <span className="text-[var(--muted)]">Account password</span>
            <PasswordInput
              name="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button
            type="submit"
            className="rounded-full border border-red-500/50 bg-red-500/15 px-4 py-2 text-sm font-bold text-red-200"
          >
            Delete my account
          </button>
        </form>
      </section>
    </div>
  );
}
