ALTER TABLE public.recurring_amounts ADD COLUMN start_year integer, ADD COLUMN start_month integer;
UPDATE public.recurring_amounts SET start_year = EXTRACT(YEAR FROM created_at AT TIME ZONE 'America/Sao_Paulo')::integer, start_month = EXTRACT(MONTH FROM created_at AT TIME ZONE 'America/Sao_Paulo')::integer;
ALTER TABLE public.recurring_amounts ADD CONSTRAINT recurring_start_month_valid CHECK (start_month BETWEEN 1 AND 12);
COMMENT ON COLUMN public.recurring_amounts.start_year IS 'First selected year to which this recurring account applies.';
COMMENT ON COLUMN public.recurring_amounts.start_month IS 'First selected month to which this recurring account applies; never apply to earlier periods.';