import type { DailyStat, LeaderboardRow, Period, Profile } from "@/lib/types";

const METERS_PER_MILE = 1609.344;

/** Calendar TZ for daily/weekly/monthly boards. Vercel runs UTC; activities use Strava local dates. */
export const APP_TIMEZONE =
  process.env.APP_TIMEZONE || process.env.NEXT_PUBLIC_APP_TIMEZONE || "America/New_York";

/** YYYY-MM-DD for `date` in `timeZone` (avoids server-UTC day rollover). */
export function calendarDateInTimeZone(
  date: Date,
  timeZone: string = APP_TIMEZONE,
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** UTC noon on a YYYY-MM-DD calendar day — safe for UTC day-of-week / month math. */
function utcNoonFromYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function ymdFromUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

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
  timeZone: string = APP_TIMEZONE,
): { start: Date; end: Date; startDate: string; endDate: string } {
  // Anchor on the app calendar day (not the server's UTC day) so evening
  // syncs still land in "today" for US users when the app runs on Vercel UTC.
  const todayYmd = calendarDateInTimeZone(now, timeZone);
  const anchor = utcNoonFromYmd(todayYmd);

  let startDate: string;
  let endDate: string;

  if (period === "daily") {
    startDate = todayYmd;
    endDate = todayYmd;
  } else if (period === "weekly") {
    // Monday–Sunday in the app timezone calendar
    const utcDay = anchor.getUTCDay(); // 0=Sun … 6=Sat
    const daysFromMonday = utcDay === 0 ? 6 : utcDay - 1;
    const start = new Date(anchor);
    start.setUTCDate(start.getUTCDate() - daysFromMonday);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    startDate = ymdFromUtc(start);
    endDate = ymdFromUtc(end);
  } else {
    const [y, m] = todayYmd.split("-").map(Number);
    startDate = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    endDate = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  }

  return {
    start: utcNoonFromYmd(startDate),
    end: utcNoonFromYmd(endDate),
    startDate,
    endDate,
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
