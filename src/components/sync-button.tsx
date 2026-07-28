"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function SyncButton({ groupId }: { groupId?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function sync() {
    setMessage(null);
    startTransition(async () => {
      const res = await fetch("/api/strava/sync", {
        method: "POST",
        headers: groupId ? { "Content-Type": "application/json" } : undefined,
        body: groupId ? JSON.stringify({ groupId }) : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Sync failed");
        return;
      }

      if (data.scope === "group") {
        const parts = [`Synced ${data.synced} member${data.synced === 1 ? "" : "s"}`];
        if (data.upserted) parts.push(`${data.upserted} new`);
        if (data.skippedExisting) parts.push(`${data.skippedExisting} already synced`);
        if (data.skippedNoStrava) parts.push(`${data.skippedNoStrava} without Strava`);
        if (data.failed) parts.push(`${data.failed} failed`);
        setMessage(parts.join(" · "));
      } else {
        const parts = [`Synced ${data.upserted} new activit${data.upserted === 1 ? "y" : "ies"}`];
        if (data.skippedExisting) {
          parts.push(`${data.skippedExisting} already synced`);
        }
        setMessage(parts.join(" · "));
      }
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
        {pending ? "Syncing…" : groupId ? "Sync group" : "Sync now"}
      </button>
      {message ? (
        <p className="text-xs text-[var(--muted)]">{message}</p>
      ) : null}
    </div>
  );
}
