import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createGroup } from "@/lib/actions";
import { PasswordInput } from "@/components/password-input";

export default async function NewGroupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-lg px-5 py-10">
      <Link href="/groups" className="text-sm text-[var(--muted)]">
        ← Groups
      </Link>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-5xl tracking-wide">
        Create a group
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        Public groups are open. Private groups need a password to join.
      </p>

      <form action={createGroup} className="panel mt-8 space-y-4 p-6">
        <label className="block space-y-2 text-sm">
          <span className="text-[var(--muted)]">Name</span>
          <input className="field" name="name" required placeholder="Office sweat crew" />
        </label>
        <label className="block space-y-2 text-sm">
          <span className="text-[var(--muted)]">Description</span>
          <textarea
            className="field min-h-[96px]"
            name="description"
            placeholder="Daily calorie crown. Miles count too."
          />
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="is_private" className="size-4 accent-[var(--accent)]" />
          <span>Private group (password required)</span>
        </label>
        <label className="block space-y-2 text-sm">
          <span className="text-[var(--muted)]">Password (private only)</span>
          <PasswordInput name="password" minLength={4} />
        </label>
        <button
          type="submit"
          className="w-full rounded-full bg-[var(--accent)] px-5 py-3 font-bold text-[var(--bg)]"
        >
          Create group
        </button>
      </form>
    </div>
  );
}
