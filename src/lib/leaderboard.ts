import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { DailyStat, LeaderboardRow, Period, Profile } from "@/lib/types";

const METERS_PER_MILE = 1609.344;

export function metersToMiles(meters: number): number {
  return meters / METERS_PER_MILE;
}

export function formatPace(miles: number, movingTimeSec: number): string | null {
  if (miles <= 0 || movingTimeSec <= 0) return null;
  const secPerMile = movingTimeSec / miles;
  if (!Number.isFinite(secPerMile) || secPerMile <= 0) return null;
  let minutes = Math.floor(secPerMile / 60);
  let seconds = Math.round(secPerMile % 60);
  // Rounding can produce 60s (e.g. 8:59.6 → 8:60); roll into the next minute.
  if (seconds === 60) {
    minutes += 1;
    seconds = 0;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatMiles(miles: number): string {
  return miles.toFixed(miles >= 10 ? 1 : 2);
}

export function formatCalories(calories: number): string {
  return Math.round(calories).toLocaleString();
}

export function periodRange(
  period: Period,
  now = new Date(),
): { start: Date; end: Date; startDate: string; endDate: string } {
  let start: Date;
  let end: Date;

  if (period === "daily") {
    start = startOfDay(now);
    end = endOfDay(now);
  } else if (period === "weekly") {
    start = startOfWeek(now, { weekStartsOn: 1 });
    end = endOfWeek(now, { weekStartsOn: 1 });
  } else {
    start = startOfMonth(now);
    end = endOfMonth(now);
  }

  return {
    start,
    end,
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
  };
}

export function aggregateLeaderboard(
  stats: DailyStat[],
  profiles: Profile[],
): LeaderboardRow[] {
  const byUser = new Map<
    string,
    {
      calories: number;
      miles: number;
      runMiles: number;
      walkMiles: number;
      runMoving: number;
      walkMoving: number;
    }
  >();

  for (const row of stats) {
    const current = byUser.get(row.user_id) ?? {
      calories: 0,
      miles: 0,
      runMiles: 0,
      walkMiles: 0,
      runMoving: 0,
      walkMoving: 0,
    };
    current.calories += Number(row.calories) || 0;
    current.miles += Number(row.miles) || 0;
    current.runMiles += Number(row.run_miles) || 0;
    current.walkMiles += Number(row.walk_miles) || 0;
    current.runMoving += Number(row.run_moving_time_sec) || 0;
    current.walkMoving += Number(row.walk_moving_time_sec) || 0;
    byUser.set(row.user_id, current);
  }

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const rows: LeaderboardRow[] = [...byUser.entries()].map(([userId, agg]) => {
    const profile = profileMap.get(userId);
    return {
      userId,
      displayName: profile?.display_name || "Athlete",
      avatarUrl: profile?.avatar_url ?? null,
      calories: agg.calories,
      miles: agg.miles,
      avgRunPace: formatPace(agg.runMiles, agg.runMoving),
      avgWalkPace: formatPace(agg.walkMiles, agg.walkMoving),
      calorieRank: 0,
      milesRank: 0,
    };
  });

  // Include members with zero activity so the board shows the whole group
  for (const profile of profiles) {
    if (!byUser.has(profile.id)) {
      rows.push({
        userId: profile.id,
        displayName: profile.display_name || "Athlete",
        avatarUrl: profile.avatar_url,
        calories: 0,
        miles: 0,
        avgRunPace: null,
        avgWalkPace: null,
        calorieRank: 0,
        milesRank: 0,
      });
    }
  }

  const byCalories = [...rows].sort((a, b) => b.calories - a.calories);
  byCalories.forEach((row, i) => {
    row.calorieRank = i + 1;
  });

  const byMiles = [...rows].sort((a, b) => b.miles - a.miles);
  byMiles.forEach((row, i) => {
    const target = rows.find((r) => r.userId === row.userId);
    if (target) target.milesRank = i + 1;
  });

  return byCalories;
}

export function mapStravaType(
  type: string,
  sportType?: string,
): "run" | "walk" | null {
  const t = (sportType || type || "").toLowerCase();
  if (t === "run" || t === "trailrun" || t === "trail_run" || t === "virtualrun") {
    return "run";
  }
  if (t === "walk" || t === "hike") {
    // Plan: Walk only for walking pace; hike maps to walk distance for miles
    return t === "walk" ? "walk" : null;
  }
  if (type === "Run" || type === "TrailRun" || type === "VirtualRun") return "run";
  if (type === "Walk") return "walk";
  return null;
}
