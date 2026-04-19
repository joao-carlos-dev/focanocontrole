-- Tabela para valores recorrentes (templates) por categoria
CREATE TABLE public.recurring_amounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL UNIQUE,
  amount NUMERIC NOT NULL DEFAULT 0,
  note TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.recurring_amounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recorrentes são públicos para leitura" ON public.recurring_amounts FOR SELECT USING (true);
CREATE POLICY "Qualquer um pode inserir recorrentes" ON public.recurring_amounts FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer um pode atualizar recorrentes" ON public.recurring_amounts FOR UPDATE USING (true);
CREATE POLICY "Qualquer um pode deletar recorrentes" ON public.recurring_amounts FOR DELETE USING (true);

CREATE TRIGGER update_recurring_amounts_updated_at
BEFORE UPDATE ON public.recurring_amounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();