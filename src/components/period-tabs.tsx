"use client";

import Link from "next/link";
import type { Period } from "@/lib/types";

const PERIODS: { id: Period; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

export function PeriodTabs({
  groupId,
  period,
}: {
  groupId: string;
  period: Period;
}) {
  return (
    <div className="period-tabs inline-flex rounded-full border border-[var(--line)] bg-[var(--surface)] p-1">
      {PERIODS.map((p) => {
        const active = p.id === period;
        return (
          <Link
            key={p.id}
            href={`/groups/${groupId}?period=${p.id}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-[var(--accent)] text-[var(--bg)]"
                : "text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            {p.label}
          </Link>
        );
      })}
    </div>
  );
}
