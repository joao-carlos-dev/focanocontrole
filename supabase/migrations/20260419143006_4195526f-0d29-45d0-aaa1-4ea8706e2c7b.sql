-- Categorias de gastos/poupança
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'expense', -- 'expense' | 'savings'
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categorias são públicas para leitura" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Qualquer um pode inserir categorias" ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer um pode atualizar categorias" ON public.categories FOR UPDATE USING (true);
CREATE POLICY "Qualquer um pode deletar categorias" ON public.categories FOR DELETE USING (true);

-- Lançamentos mensais
CREATE TABLE public.entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  note TEXT,
  month INTEGER NOT NULL, -- 1-12
  year INTEGER NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_entries_period ON public.entries(year, month);
CREATE INDEX idx_entries_category ON public.entries(category_id);

ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lançamentos são públicos para leitura" ON public.entries FOR SELECT USING (true);
CREATE POLICY "Qualquer um pode inserir lançamentos" ON public.entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer um pode atualizar lançamentos" ON public.entries FOR UPDATE USING (true);
CREATE POLICY "Qualquer um pode deletar lançamentos" ON public.entries FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_entries_updated_at
BEFORE UPDATE ON public.entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed categorias padrão
DO $$
DECLARE
  mercado_id UUID;
BEGIN
  INSERT INTO public.categories (name, kind, sort_order) VALUES
    ('Habitação', 'expense', 1),
    ('Mãe', 'expense', 2),
    ('Tim', 'expense', 3),
    ('Plano de saúde', 'expense', 4),
    ('Pão', 'expense', 5),
    ('Academia', 'expense', 6);

  INSERT INTO public.categories (name, kind, sort_order) VALUES ('Mercado', 'expense', 7) RETURNING id INTO mercado_id;
  INSERT INTO public.categories (name, parent_id, kind, sort_order) VALUES
    ('Açougue', mercado_id, 'expense', 1),
    ('Verduras', mercado_id, 'expense', 2),
    ('Comida', mercado_id, 'expense', 3);

  INSERT INTO public.categories (name, kind, sort_order) VALUES
    ('Condomínio', 'expense', 8),
    ('Rosca', 'expense', 9),
    ('Shopp', 'expense', 10),
    ('Farmácia', 'expense', 11),
    ('João', 'expense', 12),
    ('Café', 'expense', 13),
    ('Poupança', 'savings', 14),
    ('Investimento', 'savings', 15);
END $$;