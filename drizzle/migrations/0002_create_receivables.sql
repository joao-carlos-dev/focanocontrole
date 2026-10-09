CREATE TABLE public.receivables (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  group_id uuid references public.family_groups(id),
  description text not null,
  amount numeric not null default 0,
  created_by uuid,
  updated_by uuid,
  sort_order integer not null default 0,
  start_year integer,
  start_month integer,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.receivables TO authenticated;
GRANT ALL ON public.receivables TO service_role;

ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own receivables" ON public.receivables FOR SELECT TO authenticated USING ((auth.uid() = user_id) OR ((group_id IS NOT NULL) AND is_group_member(group_id, auth.uid())));
CREATE POLICY "Users insert own receivables" ON public.receivables FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id) OR ((group_id IS NOT NULL) AND is_group_member(group_id, auth.uid())));
CREATE POLICY "Users update own receivables" ON public.receivables FOR UPDATE TO authenticated USING ((auth.uid() = user_id) OR ((group_id IS NOT NULL) AND is_group_member(group_id, auth.uid())));
CREATE POLICY "Users delete own receivables" ON public.receivables FOR DELETE TO authenticated USING ((auth.uid() = user_id) OR ((group_id IS NOT NULL) AND is_group_member(group_id, auth.uid())));

CREATE TABLE public.receivable_payments (
  id uuid not null default gen_random_uuid() primary key,
  receivable_id uuid not null references public.receivables(id) on delete cascade,
  user_id uuid,
  group_id uuid references public.family_groups(id),
  amount numeric not null default 0,
  note text,
  year integer not null,
  month integer not null,
  payment_date date not null default CURRENT_DATE,
  created_by uuid,
  created_at timestamp with time zone not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.receivable_payments TO authenticated;
GRANT ALL ON public.receivable_payments TO service_role;

ALTER TABLE public.receivable_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own receivable payments" ON public.receivable_payments FOR SELECT TO authenticated USING ((auth.uid() = user_id) OR ((group_id IS NOT NULL) AND is_group_member(group_id, auth.uid())));
CREATE POLICY "Users insert own receivable payments" ON public.receivable_payments FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id) OR ((group_id IS NOT NULL) AND is_group_member(group_id, auth.uid())));
CREATE POLICY "Users update own receivable payments" ON public.receivable_payments FOR UPDATE TO authenticated USING ((auth.uid() = user_id) OR ((group_id IS NOT NULL) AND is_group_member(group_id, auth.uid())));
CREATE POLICY "Users delete own receivable payments" ON public.receivable_payments FOR DELETE TO authenticated USING ((auth.uid() = user_id) OR ((group_id IS NOT NULL) AND is_group_member(group_id, auth.uid())));