import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SyncButton } from "@/components/sync-button";
import { updateDisplayName } from "@/lib/actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, groups(id, name, is_private)")
    .eq("user_id", user.id);

  const connected = Boolean(profile?.strava_athlete_id);

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 md:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--lime)]">
        Dashboard
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl tracking-wide md:text-6xl">
        Hey, {profile?.display_name || "Athlete"}
      </h1>
      <p className="mt-3 max-w-xl text-[var(--muted)]">
        Connect Strava, jump into a group, and sweat for the calorie crown.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <section className="panel p-5">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            Strava
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {connected
              ? `Connected${profile?.last_synced_at ? ` · last sync ${new Date(profile.last_synced_at).toLocaleString()}` : ""}`
              : "Not connected yet — Apple Watch & Garmin both flow through Strava."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/connect"
              className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[var(--bg)]"
            >
              {connected ? "Manage connection" : "Connect Strava"}
            </Link>
            {connected ? <SyncButton /> : null}
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            Your name
          </h2>
          <form action={updateDisplayName} className="mt-4 flex gap-2">
            <input
              className="field"
              name="display_name"
              defaultValue={profile?.display_name || ""}
              required
            />
            <button
              type="submit"
              className="shrink-0 rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold"
            >
              Save
            </button>
          </form>
        </section>
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-wide">
            Your groups
          </h2>
          <Link
            href="/groups/new"
            className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold"
          >
            Create group
          </Link>
        </div>
        <div className="grid gap-3">
          {(memberships || []).map((m) => {
            const g = m.groups as unknown as {
              id: string;
              name: string;
              is_private: boolean;
            } | null;
            if (!g) return null;
            return (
              <Link
                key={g.id}
                href={`/groups/${g.id}`}
                className="panel flex items-center justify-between px-5 py-4 transition hover:border-[var(--accent)]/50"
              >
                <span className="font-semibold">{g.name}</span>
                <span className="text-xs uppercase tracking-wider text-[var(--muted)]">
                  {g.is_private ? "Private" : "Public"}
                </span>
              </Link>
            );
          })}
          {!memberships?.length ? (
            <div className="panel px-5 py-8 text-center text-[var(--muted)]">
              No groups yet.{" "}
              <Link href="/groups" className="text-[var(--accent)]">
                Browse public rivalries
              </Link>{" "}
              or create one.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
