import { changeGroupPassword } from "@/lib/actions";
import { PasswordInput } from "@/components/password-input";

export function GroupSettings({ groupId }: { groupId: string }) {
  return (
    <section className="panel mt-10 p-5">
      <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
        Owner settings
      </h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Change this group&apos;s password. Confirm with your account password.
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
  );
}
