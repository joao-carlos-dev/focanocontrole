CREATE OR REPLACE FUNCTION public.create_owner_family_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_email text;
BEGIN
  SELECT email INTO owner_email
  FROM public.profiles
  WHERE user_id = NEW.owner_user_id;

  INSERT INTO public.family_group_members (
    group_id,
    user_id,
    invited_email,
    invited_by,
    role,
    status,
    joined_at
  )
  VALUES (
    NEW.id,
    NEW.owner_user_id,
    COALESCE(owner_email, NEW.owner_user_id::text),
    NEW.owner_user_id,
    'owner',
    'active',
    now()
  )
  ON CONFLICT (group_id, invited_email) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_owner_family_member_on_group ON public.family_groups;
CREATE TRIGGER create_owner_family_member_on_group
AFTER INSERT ON public.family_groups
FOR EACH ROW
EXECUTE FUNCTION public.create_owner_family_member();

INSERT INTO public.family_group_members (
  group_id,
  user_id,
  invited_email,
  invited_by,
  role,
  status,
  joined_at
)
SELECT
  g.id,
  g.owner_user_id,
  COALESCE(p.email, g.owner_user_id::text),
  g.owner_user_id,
  'owner',
  'active',
  now()
FROM public.family_groups g
LEFT JOIN public.profiles p ON p.user_id = g.owner_user_id
WHERE NOT EXISTS (
  SELECT 1
  FROM public.family_group_members m
  WHERE m.group_id = g.id
    AND m.user_id = g.owner_user_id
);