import { format } from "date-fns";
import type { MonthlyWin, Profile } from "@/lib/types";

export function WinsBoard({
  wins,
  profiles,
}: {
  wins: MonthlyWin[];
  profiles: Profile[];
}) {
  const nameById = new Map(profiles.map((p) => [p.id, p.display_name]));

  const byUser = new Map<string, MonthlyWin[]>();
  for (const win of wins) {
    const list = byUser.get(win.user_id);
    if (list) list.push(win);
    else byUser.set(win.user_id, [win]);
  }

  const ranked = [...byUser.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  );

  return (
    <section className="panel p-5">
      <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
        Monthly wins
      </h2>
      {ranked.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--muted)]">
          No completed months yet. Wins are crowned when a month ends.
        </p>
      ) : (
        <ol className="mt-4 space-y-3">
          {ranked.map(([userId, userWins], index) => {
            const months = [...userWins]
              .sort((a, b) => (a.month < b.month ? 1 : -1))
              .map((w) => format(new Date(w.month + "T00:00:00"), "MMM yyyy"))
              .join(", ");
            return (
              <li
                key={userId}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-[var(--line)] pt-3 first:border-t-0 first:pt-0"
              >
                <span className="w-6 font-semibold tabular-nums text-[var(--muted)]">
                  {index + 1}
                </span>
                <span className="font-medium">
                  {nameById.get(userId) ?? "Unknown athlete"}
                </span>
                <span className="font-semibold text-[var(--accent)]">
                  <span aria-hidden>🏆 </span>
                  {userWins.length}
                </span>
                <span className="text-sm text-[var(--muted)]">{months}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
