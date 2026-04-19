import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Category = {
  id: string;
  name: string;
  parent_id: string | null;
  kind: "expense" | "savings" | "income";
  sort_order: number;
};

export type Entry = {
  id: string;
  category_id: string;
  amount: number;
  note: string | null;
  month: number;
  year: number;
  entry_date: string;
};

export function useFinance(year: number, month: number) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCategories = useCallback(async () => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true });
    if (data) setCategories(data as Category[]);
  }, []);

  const loadEntries = useCallback(async () => {
    const { data } = await supabase
      .from("entries")
      .select("*")
      .eq("year", year)
      .eq("month", month);
    if (data)
      setEntries(
        data.map((d: any) => ({ ...d, amount: Number(d.amount) })) as Entry[],
      );
  }, [year, month]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadCategories(), loadEntries()]).finally(() =>
      setLoading(false),
    );
  }, [loadCategories, loadEntries]);

  const addEntry = async (
    category_id: string,
    amount: number,
    note?: string,
  ) => {
    const { data } = await supabase
      .from("entries")
      .insert({
        category_id,
        amount,
        note: note || null,
        month,
        year,
        entry_date: new Date().toISOString().slice(0, 10),
      })
      .select()
      .single();
    if (data)
      setEntries((prev) => [
        ...prev,
        { ...(data as any), amount: Number((data as any).amount) },
      ]);
  };

  const updateEntry = async (id: string, amount: number, note?: string) => {
    const { data } = await supabase
      .from("entries")
      .update({ amount, note: note ?? null })
      .eq("id", id)
      .select()
      .single();
    if (data)
      setEntries((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...(data as any), amount: Number((data as any).amount) }
            : e,
        ),
      );
  };

  const deleteEntry = async (id: string) => {
    await supabase.from("entries").delete().eq("id", id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const addCategory = async (
    name: string,
    kind: "expense" | "savings" | "income",
    parent_id: string | null = null,
  ) => {
    const max = Math.max(0, ...categories.map((c) => c.sort_order));
    const { data } = await supabase
      .from("categories")
      .insert({ name, kind, parent_id, sort_order: max + 1 })
      .select()
      .single();
    if (data) setCategories((prev) => [...prev, data as Category]);
    return data as Category | null;
  };

  const deleteCategory = async (id: string) => {
    await supabase.from("categories").delete().eq("id", id);
    setCategories((prev) =>
      prev.filter((c) => c.id !== id && c.parent_id !== id),
    );
    setEntries((prev) => prev.filter((e) => e.category_id !== id));
  };

  return {
    categories,
    entries,
    loading,
    addEntry,
    updateEntry,
    deleteEntry,
    addCategory,
    deleteCategory,
    reload: loadEntries,
  };
}
