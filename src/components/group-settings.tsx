import { changeGroupPassword, deleteGroup } from "@/lib/actions";
import { PasswordInput } from "@/components/password-input";

export function GroupSettings({
  groupId,
  isPrivate,
}: {
  groupId: string;
  isPrivate: boolean;
}) {
  return (
    <div className="mt-10 space-y-4">
      {isPrivate ? (
        <section className="panel p-5">
          <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
            Owner settings
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Change this group&apos;s password. Confirm with your account
            password.
          </p>
          <form action={changeGroupPassword} className="mt-4 space-y-3">
            <input type="hidden" name="group_id" value={groupId} />
            <PasswordInput
              name="account_password"
              placeholder="Your account password"
              autoComplete="current-password"
              required
            />
            <PasswordInput
              name="new_password"
              placeholder="New group password"
              minLength={4}
              required
            />
            <button
              type="submit"
              className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[var(--bg)]"
            >
              Update group password
            </button>
          </form>
        </section>
      ) : null}

      <section className="panel border-red-500/30 p-5">
        <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-red-200">
          Delete group
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Permanently removes this group, its members list, and monthly wins.
          This cannot be undone.
        </p>
        <form
          action={deleteGroup}
          className="mt-4 space-y-3"
          autoComplete="off"
        >
          <input type="hidden" name="group_id" value={groupId} />
          <label className="block space-y-2 text-sm">
            <span className="text-[var(--muted)]">
              Type <span className="font-semibold text-red-200">DELETE</span>{" "}
              below to confirm
            </span>
            <input
              className="field border-red-500/40 bg-[var(--surface-2)] tracking-[0.2em]"
              type="text"
              name="confirm"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              data-1p-ignore
              data-lpignore="true"
              data-bwignore
              required
              pattern="DELETE"
              title="Type DELETE in all caps"
              placeholder="DELETE"
              aria-label="Type DELETE to confirm group deletion"
            />
          </label>
          <label className="block space-y-2 text-sm">
            <span className="text-[var(--muted)]">Account password</span>
            <PasswordInput
              name="account_password"
              autoComplete="off"
              required
            />
          </label>
          <button
            type="submit"
            className="rounded-full border border-red-500/50 bg-red-500/15 px-4 py-2 text-sm font-bold text-red-200"
          >
            Delete group
          </button>
        </form>
      </section>
    </div>
  );
}
