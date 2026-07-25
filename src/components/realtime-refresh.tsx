"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function RealtimeRefresh({ userIds }: { userIds: string[] }) {
  const router = useRouter();

  useEffect(() => {
    if (!userIds.length) return;
    const supabase = createClient();
    const channel = supabase
      .channel("daily-stats-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_stats" },
        (payload) => {
          const row = (payload.new || payload.old) as { user_id?: string } | null;
          if (row?.user_id && userIds.includes(row.user_id)) {
            router.refresh();
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userIds, router]);

  return null;
}
