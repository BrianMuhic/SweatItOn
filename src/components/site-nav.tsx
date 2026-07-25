import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function SiteNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="relative z-20 flex items-center justify-between gap-4 px-5 py-5 md:px-10">
      <Link
        href={user ? "/dashboard" : "/"}
        className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-[var(--text)]"
      >
        SweatItOn
      </Link>
      <nav className="flex items-center gap-3 text-sm">
        {user ? (
          <>
            <Link href="/groups" className="text-[var(--muted)] hover:text-[var(--text)]">
              Groups
            </Link>
            <Link href="/connect" className="text-[var(--muted)] hover:text-[var(--text)]">
              Connect
            </Link>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-[var(--muted)] hover:text-[var(--text)]"
              >
                Sign out
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/login" className="text-[var(--muted)] hover:text-[var(--text)]">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-[var(--accent)] px-4 py-2 font-semibold text-[var(--bg)]"
            >
              Start a rivalry
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
