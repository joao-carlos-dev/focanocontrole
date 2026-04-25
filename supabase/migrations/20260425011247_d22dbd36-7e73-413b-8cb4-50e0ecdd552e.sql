DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.family_group_members mine
    JOIN public.family_group_members theirs ON theirs.group_id = mine.group_id
    WHERE mine.user_id = auth.uid()
      AND mine.status = 'active'
      AND theirs.user_id = profiles.user_id
      AND theirs.status = 'active'
  )
  OR EXISTS (
    SELECT 1
    FROM public.family_groups g
    JOIN public.family_group_members m ON m.group_id = g.id
    WHERE (g.owner_user_id = auth.uid() AND m.user_id = profiles.user_id AND m.status = 'active')
       OR (g.owner_user_id = profiles.user_id AND m.user_id = auth.uid() AND m.status = 'active')
  )
);