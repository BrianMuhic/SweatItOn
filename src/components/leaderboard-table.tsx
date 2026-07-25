"use client";

import { useMemo, useState } from "react";
import type { LeaderboardRow } from "@/lib/types";
import { formatCalories, formatMiles } from "@/lib/leaderboard";

type SortMode = "calories" | "miles";

export function LeaderboardTable({ rows }: { rows: LeaderboardRow[] }) {
  const [sort, setSort] = useState<SortMode>("calories");

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) =>
      sort === "calories" ? b.calories - a.calories : b.miles - a.miles,
    );
  }, [rows, sort]);

  const winner = sorted[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSort("calories")}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
            sort === "calories"
              ? "bg-[var(--accent)] text-[var(--bg)]"
              : "border border-[var(--line)] text-[var(--muted)]"
          }`}
        >
          Crown · Calories
        </button>
        <button
          type="button"
          onClick={() => setSort("miles")}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
            sort === "miles"
              ? "bg-[var(--lime)] text-[var(--bg)]"
              : "border border-[var(--line)] text-[var(--muted)]"
          }`}
        >
          Miles · Walk + Run
        </button>
      </div>

      {winner && winner.calories > 0 && sort === "calories" ? (
        <div className="winner-banner relative overflow-hidden rounded-2xl border border-[var(--accent)]/40 bg-gradient-to-br from-[var(--accent)]/20 to-transparent px-5 py-4">
          <p className="font-[family-name:var(--font-display)] text-xs uppercase tracking-[0.2em] text-[var(--accent)]">
            SweatItOn winner
          </p>
          <p className="mt-1 text-2xl font-semibold text-[var(--text)]">
            <span aria-hidden>👑 </span>
            {winner.displayName}
          </p>
          <p className="text-sm text-[var(--muted)]">
            {formatCalories(winner.calories)} cal burned · {formatMiles(winner.miles)} mi
          </p>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-[var(--line)]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-[var(--surface-2)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Athlete</th>
              <th className="px-4 py-3 font-medium">Calories</th>
              <th className="px-4 py-3 font-medium">Miles</th>
              <th className="px-4 py-3 font-medium">Run pace</th>
              <th className="px-4 py-3 font-medium">Walk pace</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, index) => {
              const isCrown = sort === "calories" && index === 0 && row.calories > 0;
              return (
                <tr
                  key={row.userId}
                  className={`border-t border-[var(--line)] transition ${
                    isCrown ? "bg-[var(--accent)]/10" : "hover:bg-[var(--surface)]"
                  }`}
                >
                  <td className="px-4 py-3 font-semibold tabular-nums">
                    {isCrown ? "👑" : index + 1}
                  </td>
                  <td className="px-4 py-3 font-medium">{row.displayName}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatCalories(row.calories)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatMiles(row.miles)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-[var(--muted)]">
                    {row.avgRunPace ? `${row.avgRunPace} /mi` : "—"}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-[var(--muted)]">
                    {row.avgWalkPace ? `${row.avgWalkPace} /mi` : "—"}
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[var(--muted)]">
                  No rivals yet. Invite friends and hit Sync.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
