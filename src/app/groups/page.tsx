import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { joinPrivateGroup, joinPublicGroup } from "@/lib/actions";
import { PasswordInput } from "@/components/password-input";

export default async function GroupsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, description, is_private, created_at")
    .order("created_at", { ascending: false });

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id);

  const memberSet = new Set((memberships || []).map((m) => m.group_id));

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--lime)]">
            Groups
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl tracking-wide">
            Find a rivalry
          </h1>
        </div>
        <Link
          href="/groups/new"
          className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-[var(--bg)]"
        >
          Create group
        </Link>
      </div>

      <div className="mt-8 grid gap-4">
        {(groups || []).map((group) => {
          const isMember = memberSet.has(group.id);
          return (
            <article key={group.id} className="panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">{group.name}</h2>
                    <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--muted)]">
                      {group.is_private ? "Private" : "Public"}
                    </span>
                  </div>
                  {group.description ? (
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {group.description}
                    </p>
                  ) : null}
                </div>
                {isMember ? (
                  <Link
                    href={`/groups/${group.id}`}
                    className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[var(--bg)]"
                  >
                    Open board
                  </Link>
                ) : group.is_private ? (
                  <form action={joinPrivateGroup} className="flex flex-wrap gap-2">
                    <input type="hidden" name="group_id" value={group.id} />
                    <PasswordInput
                      name="password"
                      placeholder="Password"
                      required
                      className="max-w-[160px]"
                    />
                    <button
                      type="submit"
                      className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold"
                    >
                      Join
                    </button>
                  </form>
                ) : (
                  <form action={joinPublicGroup.bind(null, group.id)}>
                    <button
                      type="submit"
                      className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[var(--bg)]"
                    >
                      Join
                    </button>
                  </form>
                )}
              </div>
            </article>
          );
        })}
        {!groups?.length ? (
          <div className="panel px-5 py-10 text-center text-[var(--muted)]">
            No groups yet. Be the first to start a rivalry.
          </div>
        ) : null}
      </div>
    </div>
  );
}
