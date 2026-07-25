-- Fix group join RLS self-lookup / INSERT RETURNING.
-- Users must always be able to SELECT their own membership row, not only via
-- is_group_member(), which can miss the in-flight insert when the helper is STABLE.
--
-- App joins also switched from upsert → insert: upsert needs an UPDATE policy
-- that we intentionally omit (to avoid role escalation to owner).

drop policy if exists "Members can view membership of their groups" on public.group_members;

create policy "Members can view membership of their groups"
  on public.group_members for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_group_member(group_id, auth.uid())
  );
