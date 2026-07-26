import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncUserFromStrava } from "@/lib/strava";

// Detail fetches per activity need headroom beyond the default serverless limit.
export const maxDuration = 60;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncUserFromStrava(user.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
