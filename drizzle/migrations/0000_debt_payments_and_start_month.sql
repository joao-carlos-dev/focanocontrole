ALTER TABLE public.debts
  ADD COLUMN IF NOT EXISTS start_year integer,
  ADD COLUMN IF NOT EXISTS start_month integer;

UPDATE public.debts
SET start_year = COALESCE(start_year, EXTRACT(YEAR FROM created_at)::int),
    start_month = COALESCE(start_month, EXTRACT(MONTH FROM created_at)::int);

CREATE TABLE IF NOT EXISTS public.debt_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id uuid NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  user_id uuid,
  group_id uuid REFERENCES public.family_groups(id),
  amount numeric NOT NULL DEFAULT 0,
  note text,
  year integer NOT NULL,
  month integer NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.debt_payments TO authenticated;
GRANT ALL ON public.debt_payments TO service_role;

ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own debt payments" ON public.debt_payments
  FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) OR (group_id IS NOT NULL AND is_group_member(group_id, auth.uid())));

CREATE POLICY "Users insert own debt payments" ON public.debt_payments
  FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id) OR (group_id IS NOT NULL AND is_group_member(group_id, auth.uid())));

CREATE POLICY "Users update own debt payments" ON public.debt_payments
  FOR UPDATE TO authenticated
  USING ((auth.uid() = user_id) OR (group_id IS NOT NULL AND is_group_member(group_id, auth.uid())));

CREATE POLICY "Users delete own debt payments" ON public.debt_payments
  FOR DELETE TO authenticated
  USING ((auth.uid() = user_id) OR (group_id IS NOT NULL AND is_group_member(group_id, auth.uid())));

CREATE INDEX IF NOT EXISTS debt_payments_period_idx ON public.debt_payments (year, month);
