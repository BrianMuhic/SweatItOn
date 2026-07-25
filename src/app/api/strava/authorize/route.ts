import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStravaAuthorizeUrl } from "@/lib/strava";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL));
  }

  try {
    const url = getStravaAuthorizeUrl(user.id);
    return NextResponse.redirect(url);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Strava not configured";
    return NextResponse.redirect(
      new URL(`/connect?error=${encodeURIComponent(message)}`, process.env.NEXT_PUBLIC_APP_URL),
    );
  }
}
