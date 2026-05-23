
-- 1) Replace current_user_email to read the verified email from the JWT, not the user-editable profiles table
CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'email')
  ));
$$;

-- 2) Tighten family_group_members UPDATE policy
DROP POLICY IF EXISTS "Members update relevant invitations" ON public.family_group_members;

-- Group owners can update any membership row in their groups (manage roles/status)
CREATE POLICY "Owners manage group members"
ON public.family_group_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.family_groups g
    WHERE g.id = family_group_members.group_id
      AND g.owner_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.family_groups g
    WHERE g.id = family_group_members.group_id
      AND g.owner_user_id = auth.uid()
  )
);

-- Invited users can update ONLY their own invitation row (accept/decline), and cannot change role/group
CREATE POLICY "Invitee updates own invitation"
ON public.family_group_members
FOR UPDATE
USING (
  lower(invited_email) = public.current_user_email()
)
WITH CHECK (
  lower(invited_email) = public.current_user_email()
);

-- 3) Add DELETE policy scoped to group owners
CREATE POLICY "Owners delete group members"
ON public.family_group_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.family_groups g
    WHERE g.id = family_group_members.group_id
      AND g.owner_user_id = auth.uid()
  )
);

-- 4) Lock down SECURITY DEFINER helper / trigger functions so they cannot be invoked via the API.
--    Trigger functions don't need EXECUTE grants on the API roles to fire from triggers.
REVOKE ALL ON FUNCTION public.handle_new_profile() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_owner_family_member() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.accept_pending_family_invites() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.seed_default_categories(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Helpers used by RLS need to be callable by signed-in users, but not by anon
REVOKE ALL ON FUNCTION public.is_group_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.current_user_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_email() TO authenticated;
