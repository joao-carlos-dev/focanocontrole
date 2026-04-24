-- 1. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  whatsapp TEXT,
  notify_email BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name, whatsapp)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'whatsapp'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Add user_id to existing tables
ALTER TABLE public.categories ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.entries ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.recurring_amounts ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Add due_day to recurring_amounts and due_date + paid to entries
ALTER TABLE public.recurring_amounts ADD COLUMN due_day INTEGER CHECK (due_day BETWEEN 1 AND 31);
ALTER TABLE public.entries ADD COLUMN due_date DATE;
ALTER TABLE public.entries ADD COLUMN paid BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.entries ADD COLUMN paid_at TIMESTAMPTZ;
ALTER TABLE public.entries ADD COLUMN reminder_sent_2d BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.entries ADD COLUMN reminder_sent_1d BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.entries ADD COLUMN reminder_sent_0d BOOLEAN NOT NULL DEFAULT false;

-- 5. Drop old public RLS policies
DROP POLICY IF EXISTS "Categorias são públicas para leitura" ON public.categories;
DROP POLICY IF EXISTS "Qualquer um pode atualizar categorias" ON public.categories;
DROP POLICY IF EXISTS "Qualquer um pode deletar categorias" ON public.categories;
DROP POLICY IF EXISTS "Qualquer um pode inserir categorias" ON public.categories;

DROP POLICY IF EXISTS "Lançamentos são públicos para leitura" ON public.entries;
DROP POLICY IF EXISTS "Qualquer um pode atualizar lançamentos" ON public.entries;
DROP POLICY IF EXISTS "Qualquer um pode deletar lançamentos" ON public.entries;
DROP POLICY IF EXISTS "Qualquer um pode inserir lançamentos" ON public.entries;

DROP POLICY IF EXISTS "Recorrentes são públicos para leitura" ON public.recurring_amounts;
DROP POLICY IF EXISTS "Qualquer um pode atualizar recorrentes" ON public.recurring_amounts;
DROP POLICY IF EXISTS "Qualquer um pode deletar recorrentes" ON public.recurring_amounts;
DROP POLICY IF EXISTS "Qualquer um pode inserir recorrentes" ON public.recurring_amounts;

-- 6. New per-user RLS policies
CREATE POLICY "Users view own categories" ON public.categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own categories" ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own categories" ON public.categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own categories" ON public.categories FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users view own entries" ON public.entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own entries" ON public.entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own entries" ON public.entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own entries" ON public.entries FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users view own recurring" ON public.recurring_amounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own recurring" ON public.recurring_amounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own recurring" ON public.recurring_amounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own recurring" ON public.recurring_amounts FOR DELETE USING (auth.uid() = user_id);

-- 7. Default categories function (called after signup from client)
CREATE OR REPLACE FUNCTION public.seed_default_categories(_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  mercado_id UUID;
BEGIN
  -- Receitas
  INSERT INTO public.categories (user_id, name, kind, sort_order) VALUES (_user_id, 'Pensão INSS', 'income', 0);

  -- Gastos
  INSERT INTO public.categories (user_id, name, kind, sort_order) VALUES
    (_user_id, 'Habitação', 'expense', 1),
    (_user_id, 'Mãe', 'expense', 2),
    (_user_id, 'Tim', 'expense', 3),
    (_user_id, 'Plano de saúde', 'expense', 4),
    (_user_id, 'Pão', 'expense', 5),
    (_user_id, 'Academia', 'expense', 6),
    (_user_id, 'Condomínio', 'expense', 8),
    (_user_id, 'Rosca', 'expense', 9),
    (_user_id, 'Shopp', 'expense', 10),
    (_user_id, 'Farmácia', 'expense', 11),
    (_user_id, 'João', 'expense', 12),
    (_user_id, 'Café', 'expense', 13);

  INSERT INTO public.categories (user_id, name, kind, sort_order) VALUES (_user_id, 'Mercado', 'expense', 7) RETURNING id INTO mercado_id;
  INSERT INTO public.categories (user_id, name, kind, sort_order, parent_id) VALUES
    (_user_id, 'Açougue', 'expense', 0, mercado_id),
    (_user_id, 'Verduras', 'expense', 1, mercado_id),
    (_user_id, 'Comida', 'expense', 2, mercado_id);

  -- Poupança
  INSERT INTO public.categories (user_id, name, kind, sort_order) VALUES
    (_user_id, 'Poupança', 'savings', 14),
    (_user_id, 'Investimento', 'savings', 15);
END;
$$;

-- 8. Trigger to seed categories on profile creation
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.seed_default_categories(NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile();