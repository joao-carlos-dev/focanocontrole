CREATE TABLE IF NOT EXISTS public.family_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Família',
  owner_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.family_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  user_id UUID,
  invited_email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor',
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, invited_email)
);

CREATE TABLE IF NOT EXISTS public.monthly_report_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  group_id UUID,
  report_year INTEGER NOT NULL,
  report_month INTEGER NOT NULL,
  recipient_email TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, group_id, report_year, report_month)
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_group_id UUID,
  ADD COLUMN IF NOT EXISTS monthly_csv_email BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS group_id UUID,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID;

ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS group_id UUID,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID;

ALTER TABLE public.recurring_amounts
  ADD COLUMN IF NOT EXISTS group_id UUID,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID;

CREATE INDEX IF NOT EXISTS idx_family_group_members_user ON public.family_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_group_members_email ON public.family_group_members(invited_email);
CREATE INDEX IF NOT EXISTS idx_categories_group ON public.categories(group_id);
CREATE INDEX IF NOT EXISTS idx_entries_group ON public.entries(group_id);
CREATE INDEX IF NOT EXISTS idx_recurring_group ON public.recurring_amounts(group_id);
CREATE INDEX IF NOT EXISTS idx_monthly_report_sends_period ON public.monthly_report_sends(report_year, report_month);

ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_report_sends ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_groups g
    WHERE g.id = _group_id AND g.owner_user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.family_group_members m
    WHERE m.group_id = _group_id
      AND m.user_id = _user_id
      AND m.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.profiles WHERE user_id = auth.uid();
$$;

DROP POLICY IF EXISTS "Users view own groups" ON public.family_groups;
CREATE POLICY "Users view own groups"
ON public.family_groups
FOR SELECT
USING (public.is_group_member(id, auth.uid()));

DROP POLICY IF EXISTS "Users create own groups" ON public.family_groups;
CREATE POLICY "Users create own groups"
ON public.family_groups
FOR INSERT
WITH CHECK (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "Group owners update groups" ON public.family_groups;
CREATE POLICY "Group owners update groups"
ON public.family_groups
FOR UPDATE
USING (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "Group owners delete groups" ON public.family_groups;
CREATE POLICY "Group owners delete groups"
ON public.family_groups
FOR DELETE
USING (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "Users view group members" ON public.family_group_members;
CREATE POLICY "Users view group members"
ON public.family_group_members
FOR SELECT
USING (public.is_group_member(group_id, auth.uid()) OR lower(invited_email) = lower(public.current_user_email()));

DROP POLICY IF EXISTS "Group members invite members" ON public.family_group_members;
CREATE POLICY "Group members invite members"
ON public.family_group_members
FOR INSERT
WITH CHECK (public.is_group_member(group_id, auth.uid()) AND auth.uid() = invited_by);

DROP POLICY IF EXISTS "Members update relevant invitations" ON public.family_group_members;
CREATE POLICY "Members update relevant invitations"
ON public.family_group_members
FOR UPDATE
USING (public.is_group_member(group_id, auth.uid()) OR lower(invited_email) = lower(public.current_user_email()));

DROP POLICY IF EXISTS "Users view own monthly reports" ON public.monthly_report_sends;
CREATE POLICY "Users view own monthly reports"
ON public.monthly_report_sends
FOR SELECT
USING (auth.uid() = user_id OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid())));

DROP POLICY IF EXISTS "System can insert monthly reports" ON public.monthly_report_sends;
CREATE POLICY "System can insert monthly reports"
ON public.monthly_report_sends
FOR INSERT
WITH CHECK (auth.uid() = user_id OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid())));

DROP POLICY IF EXISTS "Users view own categories" ON public.categories;
CREATE POLICY "Users view own categories"
ON public.categories
FOR SELECT
USING (auth.uid() = user_id OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid())));

DROP POLICY IF EXISTS "Users insert own categories" ON public.categories;
CREATE POLICY "Users insert own categories"
ON public.categories
FOR INSERT
WITH CHECK (auth.uid() = user_id OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid())));

DROP POLICY IF EXISTS "Users update own categories" ON public.categories;
CREATE POLICY "Users update own categories"
ON public.categories
FOR UPDATE
USING (auth.uid() = user_id OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid())));

DROP POLICY IF EXISTS "Users delete own categories" ON public.categories;
CREATE POLICY "Users delete own categories"
ON public.categories
FOR DELETE
USING (auth.uid() = user_id OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid())));

DROP POLICY IF EXISTS "Users view own entries" ON public.entries;
CREATE POLICY "Users view own entries"
ON public.entries
FOR SELECT
USING (auth.uid() = user_id OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid())));

DROP POLICY IF EXISTS "Users insert own entries" ON public.entries;
CREATE POLICY "Users insert own entries"
ON public.entries
FOR INSERT
WITH CHECK (auth.uid() = user_id OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid())));

DROP POLICY IF EXISTS "Users update own entries" ON public.entries;
CREATE POLICY "Users update own entries"
ON public.entries
FOR UPDATE
USING (auth.uid() = user_id OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid())));

DROP POLICY IF EXISTS "Users delete own entries" ON public.entries;
CREATE POLICY "Users delete own entries"
ON public.entries
FOR DELETE
USING (auth.uid() = user_id OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid())));

DROP POLICY IF EXISTS "Users view own recurring" ON public.recurring_amounts;
CREATE POLICY "Users view own recurring"
ON public.recurring_amounts
FOR SELECT
USING (auth.uid() = user_id OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid())));

DROP POLICY IF EXISTS "Users insert own recurring" ON public.recurring_amounts;
CREATE POLICY "Users insert own recurring"
ON public.recurring_amounts
FOR INSERT
WITH CHECK (auth.uid() = user_id OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid())));

DROP POLICY IF EXISTS "Users update own recurring" ON public.recurring_amounts;
CREATE POLICY "Users update own recurring"
ON public.recurring_amounts
FOR UPDATE
USING (auth.uid() = user_id OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid())));

DROP POLICY IF EXISTS "Users delete own recurring" ON public.recurring_amounts;
CREATE POLICY "Users delete own recurring"
ON public.recurring_amounts
FOR DELETE
USING (auth.uid() = user_id OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid())));

CREATE OR REPLACE FUNCTION public.seed_default_categories(_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  mercado_id UUID;
  investimento_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM public.categories WHERE user_id = _user_id AND group_id IS NULL) THEN
    RETURN;
  END IF;

  INSERT INTO public.categories (user_id, created_by, updated_by, name, kind, sort_order)
  VALUES (_user_id, _user_id, _user_id, 'Salário', 'income', 0);

  INSERT INTO public.categories (user_id, created_by, updated_by, name, kind, sort_order) VALUES
    (_user_id, _user_id, _user_id, 'Habitação', 'expense', 1),
    (_user_id, _user_id, _user_id, 'Telefone móvel', 'expense', 2),
    (_user_id, _user_id, _user_id, 'Saúde', 'expense', 3),
    (_user_id, _user_id, _user_id, 'Internet', 'expense', 5),
    (_user_id, _user_id, _user_id, 'Automóvel', 'expense', 6);

  INSERT INTO public.categories (user_id, created_by, updated_by, name, kind, sort_order)
  VALUES (_user_id, _user_id, _user_id, 'Mercado', 'expense', 4) RETURNING id INTO mercado_id;

  INSERT INTO public.categories (user_id, created_by, updated_by, name, kind, sort_order, parent_id) VALUES
    (_user_id, _user_id, _user_id, 'Açougue', 'expense', 0, mercado_id),
    (_user_id, _user_id, _user_id, 'Verduras', 'expense', 1, mercado_id);

  INSERT INTO public.categories (user_id, created_by, updated_by, name, kind, sort_order)
  VALUES (_user_id, _user_id, _user_id, 'Investimento', 'savings', 7) RETURNING id INTO investimento_id;

  INSERT INTO public.categories (user_id, created_by, updated_by, name, kind, sort_order, parent_id) VALUES
    (_user_id, _user_id, _user_id, 'Tesouro direto', 'savings', 0, investimento_id),
    (_user_id, _user_id, _user_id, 'Bolsa de valores', 'savings', 1, investimento_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.accept_pending_family_invites()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.family_group_members
  SET user_id = NEW.user_id,
      status = 'active',
      joined_at = COALESCE(joined_at, now()),
      updated_at = now()
  WHERE lower(invited_email) = lower(NEW.email)
    AND status = 'pending';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS accept_pending_family_invites_on_profile ON public.profiles;
CREATE TRIGGER accept_pending_family_invites_on_profile
AFTER INSERT OR UPDATE OF email ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.accept_pending_family_invites();

DROP TRIGGER IF EXISTS update_family_groups_updated_at ON public.family_groups;
CREATE TRIGGER update_family_groups_updated_at
BEFORE UPDATE ON public.family_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_family_group_members_updated_at ON public.family_group_members;
CREATE TRIGGER update_family_group_members_updated_at
BEFORE UPDATE ON public.family_group_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();