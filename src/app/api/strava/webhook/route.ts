import { NextResponse } from "next/server";
import {
  fetchActivityById,
  findUserIdByAthleteId,
  refreshStravaToken,
  upsertActivitiesForUser,
} from "@/lib/strava";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Strava webhook validation + event receiver.
 * Register at https://www.strava.com/settings/api after deploy.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === process.env.STRAVA_VERIFY_TOKEN &&
    challenge
  ) {
    return NextResponse.json({ "hub.challenge": challenge });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  // Always acknowledge quickly per Strava docs
  const response = NextResponse.json({ ok: true });

  if (!body || body.object_type !== "activity") {
    return response;
  }

  if (body.aspect_type !== "create" && body.aspect_type !== "update") {
    return response;
  }

  try {
    const athleteId = Number(body.owner_id);
    const activityId = Number(body.object_id);
    const userId = await findUserIdByAthleteId(athleteId);
    if (!userId) return response;

    const admin = createAdminClient();
    const { data: tokens } = await admin
      .from("strava_tokens")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (!tokens) return response;

    let accessToken = tokens.access_token;
    if (new Date(tokens.expires_at).getTime() <= Date.now() + 60_000) {
      const refreshed = await refreshStravaToken(tokens.refresh_token);
      accessToken = refreshed.access_token;
      await admin.from("strava_tokens").upsert({
        user_id: userId,
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    const activity = await fetchActivityById(accessToken, activityId);
    await upsertActivitiesForUser(userId, [activity]);
  } catch {
    // Swallow — webhook must return 200
  }

  return response;
}
