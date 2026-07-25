import { createAdminClient } from "@/lib/supabase/admin";
import { mapStravaType, metersToMiles } from "@/lib/leaderboard";

const STRAVA_AUTH = "https://www.strava.com/oauth/authorize";
const STRAVA_TOKEN = "https://www.strava.com/oauth/token";
const STRAVA_API = "https://www.strava.com/api/v3";

export type StravaTokens = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix seconds
  athlete?: { id: number };
};

export function getStravaAuthorizeUrl(state: string): string {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!clientId || !appUrl) {
    throw new Error("Missing STRAVA_CLIENT_ID or NEXT_PUBLIC_APP_URL");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${appUrl}/api/strava/callback`,
    response_type: "code",
    approval_prompt: "auto",
    scope: "read,activity:read_all",
    state,
  });

  return `${STRAVA_AUTH}?${params.toString()}`;
}

export async function exchangeStravaCode(code: string): Promise<StravaTokens> {
  const res = await fetch(STRAVA_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strava token exchange failed: ${text}`);
  }

  return res.json();
}

export async function refreshStravaToken(refreshToken: string): Promise<StravaTokens> {
  const res = await fetch(STRAVA_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strava refresh failed: ${text}`);
  }

  return res.json();
}

async function getValidAccessToken(userId: string): Promise<string> {
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("strava_tokens")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !row) {
    throw new Error("Strava is not connected");
  }

  const expiresAt = new Date(row.expires_at).getTime();
  if (expiresAt > Date.now() + 60_000) {
    return row.access_token;
  }

  const refreshed = await refreshStravaToken(row.refresh_token);
  await admin.from("strava_tokens").upsert({
    user_id: userId,
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token,
    expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  });

  return refreshed.access_token;
}

type StravaActivity = {
  id: number;
  name: string;
  type: string;
  sport_type?: string;
  start_date: string;
  start_date_local: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  calories?: number;
  kilojoules?: number;
};

function activityCalories(a: StravaActivity): number {
  if (typeof a.calories === "number" && a.calories > 0) return a.calories;
  if (typeof a.kilojoules === "number" && a.kilojoules > 0) {
    return a.kilojoules / 4.184;
  }
  return 0;
}

export async function fetchRecentActivities(
  accessToken: string,
  afterUnix?: number,
): Promise<StravaActivity[]> {
  const params = new URLSearchParams({
    per_page: "100",
    page: "1",
  });
  if (afterUnix) params.set("after", String(afterUnix));

  const res = await fetch(`${STRAVA_API}/athlete/activities?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strava activities failed: ${text}`);
  }

  return res.json();
}

export async function fetchActivityById(
  accessToken: string,
  activityId: number,
): Promise<StravaActivity> {
  const res = await fetch(`${STRAVA_API}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strava activity ${activityId} failed: ${text}`);
  }
  return res.json();
}

export async function upsertActivitiesForUser(
  userId: string,
  activities: StravaActivity[],
): Promise<{ upserted: number; dates: string[] }> {
  const admin = createAdminClient();
  const dates = new Set<string>();
  const rows = [];

  for (const activity of activities) {
    const kind = mapStravaType(activity.type, activity.sport_type);
    if (!kind) continue;
    if (!activity.distance || activity.distance <= 0) continue;

    const activityDate = activity.start_date_local.slice(0, 10);
    dates.add(activityDate);

    rows.push({
      id: activity.id,
      user_id: userId,
      sport_kind: kind,
      strava_type: activity.sport_type || activity.type,
      start_date: activity.start_date,
      activity_date: activityDate,
      distance_meters: activity.distance,
      moving_time_sec: activity.moving_time,
      calories: activityCalories(activity),
      synced_at: new Date().toISOString(),
    });
  }

  if (rows.length) {
    const { error } = await admin.from("activities").upsert(rows, { onConflict: "id" });
    if (error) throw error;
  }

  for (const date of dates) {
    const { error } = await admin.rpc("recompute_daily_stats", {
      p_user_id: userId,
      p_date: date,
    });
    if (error) {
      // Fallback if RPC missing: recompute in JS
      await recomputeDailyStatsJs(userId, date);
    }
  }

  await admin
    .from("profiles")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", userId);

  return { upserted: rows.length, dates: [...dates] };
}

async function recomputeDailyStatsJs(userId: string, date: string) {
  const admin = createAdminClient();
  const { data: acts } = await admin
    .from("activities")
    .select("*")
    .eq("user_id", userId)
    .eq("activity_date", date);

  if (!acts?.length) {
    await admin.from("daily_stats").delete().eq("user_id", userId).eq("stat_date", date);
    return;
  }

  let calories = 0;
  let meters = 0;
  let runMeters = 0;
  let walkMeters = 0;
  let runMoving = 0;
  let walkMoving = 0;

  for (const a of acts) {
    calories += Number(a.calories) || 0;
    meters += Number(a.distance_meters) || 0;
    if (a.sport_kind === "run") {
      runMeters += Number(a.distance_meters) || 0;
      runMoving += Number(a.moving_time_sec) || 0;
    } else {
      walkMeters += Number(a.distance_meters) || 0;
      walkMoving += Number(a.moving_time_sec) || 0;
    }
  }

  await admin.from("daily_stats").upsert({
    user_id: userId,
    stat_date: date,
    calories,
    miles: metersToMiles(meters),
    run_miles: metersToMiles(runMeters),
    walk_miles: metersToMiles(walkMeters),
    run_moving_time_sec: runMoving,
    walk_moving_time_sec: walkMoving,
    updated_at: new Date().toISOString(),
  });
}

export async function syncUserFromStrava(userId: string): Promise<{ upserted: number }> {
  const token = await getValidAccessToken(userId);
  // Last 30 days
  const after = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
  const activities = await fetchRecentActivities(token, after);
  return upsertActivitiesForUser(userId, activities);
}

export async function saveStravaConnection(
  userId: string,
  tokens: StravaTokens,
): Promise<void> {
  const admin = createAdminClient();

  await admin.from("strava_tokens").upsert({
    user_id: userId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(tokens.expires_at * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (tokens.athlete?.id) {
    await admin
      .from("profiles")
      .update({
        strava_athlete_id: tokens.athlete.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
  }
}

export async function findUserIdByAthleteId(
  athleteId: number,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("strava_athlete_id", athleteId)
    .maybeSingle();
  return data?.id ?? null;
}
