import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  exchangeStravaCode,
  saveStravaConnection,
  syncUserFromStrava,
} from "@/lib/strava";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (error) {
    return NextResponse.redirect(
      `${appUrl}/connect?error=${encodeURIComponent(error)}`,
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/connect?error=missing_code`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== state) {
    return NextResponse.redirect(`${appUrl}/login?next=/connect`);
  }

  try {
    const tokens = await exchangeStravaCode(code);
    await saveStravaConnection(user.id, tokens);
    await syncUserFromStrava(user.id);
    return NextResponse.redirect(`${appUrl}/connect?connected=1`);
  } catch (e) {
    const message = e instanceof Error ? e.message : "connect_failed";
    return NextResponse.redirect(
      `${appUrl}/connect?error=${encodeURIComponent(message)}`,
    );
  }
}
