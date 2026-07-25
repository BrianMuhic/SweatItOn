import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SyncButton } from "@/components/sync-button";

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const params = await searchParams;
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

  const connected = Boolean(profile?.strava_athlete_id);

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 md:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--lime)]">
        Connect
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl tracking-wide">
        Link Strava
      </h1>
      <p className="mt-3 text-[var(--muted)]">
        One connection powers Apple Watch and Garmin. SweatItOn reads Run and
        Walk activities for calories, miles, and pace.
      </p>

      {params.connected ? (
        <p className="mt-4 rounded-xl border border-[var(--lime)]/40 bg-[var(--lime)]/10 px-3 py-2 text-sm text-[var(--lime)]">
          Strava connected. Sync anytime from a group board.
        </p>
      ) : null}
      {params.error ? (
        <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {params.error}
        </p>
      ) : null}

      <div className="panel mt-8 space-y-4 p-6">
        <p className="text-sm">
          Status:{" "}
          <strong className={connected ? "text-[var(--lime)]" : "text-[var(--accent)]"}>
            {connected ? "Connected" : "Not connected"}
          </strong>
        </p>
        <a
          href="/api/strava/authorize"
          className="inline-flex rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-bold text-[var(--bg)]"
        >
          {connected ? "Reconnect Strava" : "Connect Strava"}
        </a>
        {connected ? <SyncButton /> : null}
      </div>

      <div className="mt-8 grid gap-4">
        <article className="panel p-5">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            Apple Watch
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[var(--muted)]">
            <li>Install the free Strava iOS app and sign in.</li>
            <li>Allow Strava to read workouts from Apple Health / Watch.</li>
            <li>Record or import runs and walks, then tap Sync now here.</li>
          </ol>
        </article>
        <article className="panel p-5">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            Garmin
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[var(--muted)]">
            <li>In Garmin Connect, enable upload to Strava.</li>
            <li>Connect the same Strava account to SweatItOn.</li>
            <li>After your next walk or run syncs, hit Sync now.</li>
          </ol>
        </article>
      </div>

      <div className="mt-8 flex gap-3">
        <Link
          href="/groups/new"
          className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold"
        >
          Create a group
        </Link>
        <Link
          href="/dashboard"
          className="rounded-full px-4 py-2 text-sm text-[var(--muted)]"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
