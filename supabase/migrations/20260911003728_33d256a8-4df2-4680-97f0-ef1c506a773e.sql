CREATE TABLE public.debts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  group_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_by UUID,
  updated_by UUID,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.debts TO authenticated;
GRANT ALL ON public.debts TO service_role;

ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own debts" ON public.debts FOR SELECT TO authenticated
USING ((auth.uid() = user_id) OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid())));

CREATE POLICY "Users insert own debts" ON public.debts FOR INSERT TO authenticated
WITH CHECK ((auth.uid() = user_id) OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid())));

CREATE POLICY "Users update own debts" ON public.debts FOR UPDATE TO authenticated
USING ((auth.uid() = user_id) OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid())));

CREATE POLICY "Users delete own debts" ON public.debts FOR DELETE TO authenticated
USING ((auth.uid() = user_id) OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid())));

CREATE TRIGGER update_debts_updated_at BEFORE UPDATE ON public.debts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();