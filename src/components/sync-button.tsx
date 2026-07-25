"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function SyncButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function sync() {
    setMessage(null);
    startTransition(async () => {
      const res = await fetch("/api/strava/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Sync failed");
        return;
      }
      setMessage(`Synced ${data.upserted} activities`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={sync}
        disabled={pending}
        className="sync-btn inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--bg)] transition enabled:hover:brightness-110 disabled:opacity-60"
      >
        <span className={pending ? "sync-pulse inline-block h-2 w-2 rounded-full bg-[var(--bg)]" : "inline-block h-2 w-2 rounded-full bg-[var(--bg)]/70"} />
        {pending ? "Syncing…" : "Sync now"}
      </button>
      {message ? (
        <p className="text-xs text-[var(--muted)]">{message}</p>
      ) : null}
    </div>
  );
}
