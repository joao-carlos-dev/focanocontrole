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

export type Recurring = {
  id: string;
  category_id: string;
  amount: number;
  note: string | null;
  active: boolean;
};

export function useFinance(year: number, month: number) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [recurring, setRecurring] = useState<Recurring[]>([]);
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
    return (data || []) as any[];
  }, [year, month]);

  const loadRecurring = useCallback(async () => {
    const { data } = await supabase.from("recurring_amounts").select("*");
    const list = (data || []).map((d: any) => ({
      ...d,
      amount: Number(d.amount),
    })) as Recurring[];
    setRecurring(list);
    return list;
  }, []);

  // Auto-apply active recurring templates for the current month if no entry exists yet
  const applyRecurringIfMissing = useCallback(
    async (recList: Recurring[], existing: any[]) => {
      const existingByCat = new Set(existing.map((e) => e.category_id));
      const toInsert = recList
        .filter((r) => r.active && !existingByCat.has(r.category_id))
        .map((r) => ({
          category_id: r.category_id,
          amount: r.amount,
          note: r.note,
          month,
          year,
          entry_date: new Date(year, month - 1, 1).toISOString().slice(0, 10),
        }));
      if (toInsert.length === 0) return;
      const { data } = await supabase
        .from("entries")
        .insert(toInsert)
        .select();
      if (data) {
        setEntries((prev) => [
          ...prev,
          ...data.map((d: any) => ({ ...d, amount: Number(d.amount) })),
        ]);
      }
    },
    [year, month],
  );

  useEffect(() => {
    setLoading(true);
    (async () => {
      const [_, entriesData, recList] = await Promise.all([
        loadCategories(),
        loadEntries(),
        loadRecurring(),
      ]);
      await applyRecurringIfMissing(recList, entriesData);
      setLoading(false);
    })();
  }, [loadCategories, loadEntries, loadRecurring, applyRecurringIfMissing]);

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
    setRecurring((prev) => prev.filter((r) => r.category_id !== id));
  };

  const setRecurringForCategory = async (
    category_id: string,
    amount: number,
    note?: string,
  ) => {
    const existing = recurring.find((r) => r.category_id === category_id);
    if (existing) {
      const { data } = await supabase
        .from("recurring_amounts")
        .update({ amount, note: note ?? null, active: true })
        .eq("id", existing.id)
        .select()
        .single();
      if (data)
        setRecurring((prev) =>
          prev.map((r) =>
            r.id === existing.id
              ? { ...(data as any), amount: Number((data as any).amount) }
              : r,
          ),
        );
    } else {
      const { data } = await supabase
        .from("recurring_amounts")
        .insert({ category_id, amount, note: note || null, active: true })
        .select()
        .single();
      if (data)
        setRecurring((prev) => [
          ...prev,
          { ...(data as any), amount: Number((data as any).amount) },
        ]);
    }
  };

  const removeRecurringForCategory = async (category_id: string) => {
    const existing = recurring.find((r) => r.category_id === category_id);
    if (!existing) return;
    await supabase.from("recurring_amounts").delete().eq("id", existing.id);
    setRecurring((prev) => prev.filter((r) => r.id !== existing.id));
  };

  return {
    categories,
    entries,
    recurring,
    loading,
    addEntry,
    updateEntry,
    deleteEntry,
    addCategory,
    deleteCategory,
    setRecurringForCategory,
    removeRecurringForCategory,
    reload: loadEntries,
  };
}
