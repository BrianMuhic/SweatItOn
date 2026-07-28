import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { leaveGroup, joinPrivateGroup, joinPublicGroup } from "@/lib/actions";
import { PasswordInput } from "@/components/password-input";
import { PeriodTabs } from "@/components/period-tabs";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { WinsBoard } from "@/components/wins-board";
import { SyncButton } from "@/components/sync-button";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { GroupSettings } from "@/components/group-settings";
import { aggregateLeaderboard, periodRange } from "@/lib/leaderboard";
import type { DailyStat, MonthlyWin, Period, Profile } from "@/lib/types";

export default async function GroupDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string; error?: string; success?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const period = (["daily", "weekly", "monthly"].includes(sp.period || "")
    ? sp.period
    : "daily") as Period;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, description, is_private, created_by")
    .eq("id", id)
    .maybeSingle();

  if (!group) notFound();

  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16">
        <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-wide">
          {group.name}
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          Join this {group.is_private ? "private" : "public"} group to see the
          leaderboard.
        </p>
        {sp.error ? (
          <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {sp.error}
          </p>
        ) : null}
        {group.is_private ? (
          <form action={joinPrivateGroup} className="panel mt-6 space-y-3 p-5">
            <input type="hidden" name="group_id" value={group.id} />
            <PasswordInput
              name="password"
              placeholder="Group password"
              required
            />
            <button
              type="submit"
              className="w-full rounded-full bg-[var(--accent)] px-4 py-3 font-bold text-[var(--bg)]"
            >
              Join with password
            </button>
          </form>
        ) : (
          <form action={joinPublicGroup.bind(null, group.id)} className="mt-6">
            <button
              type="submit"
              className="rounded-full bg-[var(--accent)] px-5 py-3 font-bold text-[var(--bg)]"
            >
              Join group
            </button>
          </form>
        )}
      </div>
    );
  }

  const { data: members } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", id);

  const userIds = (members || []).map((m) => m.user_id);
  const { startDate, endDate } = periodRange(period);

  const [{ data: profiles }, { data: stats }] = await Promise.all([
    supabase.from("profiles").select("*").in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]),
    supabase
      .from("daily_stats")
      .select("*")
      .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"])
      .gte("stat_date", startDate)
      .lte("stat_date", endDate),
  ]);

  try {
    const admin = createAdminClient();
    await admin.rpc("recompute_monthly_wins", { p_group_id: id });
  } catch {
    // Migration may not be applied yet; wins will simply be empty.
  }

  const { data: wins } = await supabase
    .from("monthly_wins")
    .select("*")
    .eq("group_id", id)
    .order("month", { ascending: false });

  const rows = aggregateLeaderboard(
    (stats || []) as DailyStat[],
    (profiles || []) as Profile[],
  );

  const { data: me } = await supabase
    .from("profiles")
    .select("strava_athlete_id")
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 md:px-8">
      <RealtimeRefresh userIds={userIds} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/groups" className="text-sm text-[var(--muted)]">
            ← Groups
          </Link>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl tracking-wide">
            {group.name}
          </h1>
          {group.description ? (
            <p className="mt-2 max-w-xl text-[var(--muted)]">{group.description}</p>
          ) : null}
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            {group.is_private ? "Private" : "Public"} · {userIds.length} rivals ·{" "}
            {period} board
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <PeriodTabs groupId={group.id} period={period} />
          <SyncButton groupId={group.id} />
          {!me?.strava_athlete_id ? (
            <Link
              href="/connect"
              className="text-xs text-[var(--muted)] underline-offset-2 hover:underline"
            >
              Connect your Strava
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-8">
        <LeaderboardTable rows={rows} />
      </div>

      <div className="mt-8">
        <WinsBoard
          wins={(wins || []) as MonthlyWin[]}
          profiles={(profiles || []) as Profile[]}
        />
      </div>

      {sp.success ? (
        <p className="mt-6 rounded-xl border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-200">
          {sp.success}
        </p>
      ) : null}
      {sp.error ? (
        <p className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {sp.error}
        </p>
      ) : null}

      {group.created_by === user.id ? (
        <GroupSettings groupId={group.id} isPrivate={group.is_private} />
      ) : null}

      {group.created_by !== user.id ? (
        <form action={leaveGroup.bind(null, group.id)} className="mt-10">
          <button
            type="submit"
            className="text-sm text-[var(--muted)] hover:text-[var(--accent)]"
          >
            Leave group
          </button>
        </form>
      ) : null}
    </div>
  );
}
