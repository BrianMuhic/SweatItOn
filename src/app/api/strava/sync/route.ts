import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncGroupFromStrava, syncUserFromStrava } from "@/lib/strava";

// Detail fetches per activity need headroom beyond the default serverless limit.
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let groupId: string | undefined;
  try {
    const body = await request.json();
    if (body && typeof body.groupId === "string") {
      groupId = body.groupId;
    }
  } catch {
    // No JSON body — personal sync
  }

  try {
    if (groupId) {
      const { data: membership } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!membership) {
        return NextResponse.json(
          { error: "You must be a member of this group to sync it" },
          { status: 403 },
        );
      }

      const result = await syncGroupFromStrava(groupId);
      return NextResponse.json({ ok: true, scope: "group", ...result });
    }

    const result = await syncUserFromStrava(user.id);
    return NextResponse.json({ ok: true, scope: "user", ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
