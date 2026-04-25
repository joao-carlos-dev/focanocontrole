import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type Category = {
  id: string;
  name: string;
  parent_id: string | null;
  kind: "expense" | "savings" | "income";
  sort_order: number;
  user_id: string | null;
  group_id: string | null;
  created_by: string | null;
  updated_by: string | null;
};

export type Entry = {
  id: string;
  category_id: string;
  amount: number;
  note: string | null;
  month: number;
  year: number;
  entry_date: string;
  due_date: string | null;
  paid: boolean;
  created_by: string | null;
  updated_by: string | null;
};

export type Recurring = {
  id: string;
  category_id: string;
  amount: number;
  note: string | null;
  active: boolean;
  due_day: number | null;
};

export function useFinance(year: number, month: number) {
  const { user, profile } = useAuth();
  const activeGroupId = profile?.active_group_id ?? null;
  const [categories, setCategories] = useState<Category[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [editorNames, setEditorNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const loadCategories = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("categories")
      .select("*")
      .or(activeGroupId ? `group_id.eq.${activeGroupId}` : `and(user_id.eq.${user.id},group_id.is.null)`)
      .order("sort_order", { ascending: true });
    if (data) setCategories(data as Category[]);
    return (data || []) as Category[];
  }, [user, activeGroupId]);

  const loadEntries = useCallback(async () => {
    if (!user) return [];
    const { data } = await supabase
      .from("entries")
      .select("*")
      .or(activeGroupId ? `group_id.eq.${activeGroupId}` : `and(user_id.eq.${user.id},group_id.is.null)`)
      .eq("year", year)
      .eq("month", month);
    if (data)
      setEntries(
        data.map((d: any) => ({ ...d, amount: Number(d.amount) })) as Entry[],
      );
    return (data || []) as any[];
  }, [year, month, user, activeGroupId]);

  const loadRecurring = useCallback(async () => {
    if (!user) return [];
    const { data } = await supabase
      .from("recurring_amounts")
      .select("*")
      .or(activeGroupId ? `group_id.eq.${activeGroupId}` : `and(user_id.eq.${user.id},group_id.is.null)`);
    const list = (data || []).map((d: any) => ({
      ...d,
      amount: Number(d.amount),
    })) as Recurring[];
    setRecurring(list);
    return list;
  }, [user, activeGroupId]);

  const applyRecurringIfMissing = useCallback(
    async (recList: Recurring[], existing: any[]) => {
      if (!user) return;
      const existingByCat = new Set(existing.map((e) => e.category_id));
      const toInsert = recList
        .filter((r) => r.active && !existingByCat.has(r.category_id))
        .map((r) => {
          const day = r.due_day && r.due_day >= 1 && r.due_day <= 28 ? r.due_day : null;
          const due = day
            ? new Date(year, month - 1, day).toISOString().slice(0, 10)
            : null;
          return {
            user_id: user.id,
            group_id: activeGroupId,
            created_by: user.id,
            updated_by: user.id,
            category_id: r.category_id,
            amount: r.amount,
            note: r.note,
            month,
            year,
            entry_date: new Date(year, month - 1, 1).toISOString().slice(0, 10),
            due_date: due,
            paid: false,
          };
        });
      if (toInsert.length === 0) return;
      const { data } = await supabase.from("entries").insert(toInsert).select();
      if (data) {
        setEntries((prev) => [
          ...prev,
          ...data.map((d: any) => ({ ...d, amount: Number(d.amount) })),
        ]);
      }
    },
    [year, month, user, activeGroupId],
  );

  const loadEditorNames = useCallback(async (entryList: Entry[], categoryList: Category[]) => {
    const ids = Array.from(new Set([
      ...entryList.flatMap((e) => [e.created_by, e.updated_by]),
      ...categoryList.flatMap((c) => [c.created_by, c.updated_by]),
    ].filter(Boolean))) as string[];
    if (ids.length === 0) return;
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, email")
      .in("user_id", ids);
    const map: Record<string, string> = {};
    for (const p of data || []) {
      map[(p as any).user_id] = (p as any).display_name || (p as any).email || "Usuário";
    }
    setEditorNames(map);
  }, []);

  useEffect(() => {
    if (!user) {
      setCategories([]);
      setEntries([]);
      setRecurring([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const [catsData, entriesData, recList] = await Promise.all([
        loadCategories(),
        loadEntries(),
        loadRecurring(),
      ]);
      await applyRecurringIfMissing(recList, entriesData);
      await loadEditorNames(entriesData as Entry[], (catsData as Category[]) || []);
      setLoading(false);
    })();
  }, [user, activeGroupId, loadCategories, loadEntries, loadRecurring, applyRecurringIfMissing, loadEditorNames]);

  const addEntry = async (
    category_id: string,
    amount: number,
    note?: string,
    due_date?: string | null,
  ) => {
    if (!user) return;
    const { data } = await supabase
      .from("entries")
      .insert({
        user_id: user.id,
        group_id: activeGroupId,
        created_by: user.id,
        updated_by: user.id,
        category_id,
        amount,
        note: note || null,
        month,
        year,
        entry_date: new Date().toISOString().slice(0, 10),
        due_date: due_date || null,
        paid: false,
      })
      .select()
      .single();
    if (data)
      setEntries((prev) => [
        ...prev,
        { ...(data as any), amount: Number((data as any).amount) },
      ]);
  };

  const updateEntry = async (
    id: string,
    amount: number,
    note?: string,
    due_date?: string | null,
  ) => {
    const update: any = { amount, note: note ?? null, updated_by: user?.id ?? null };
    if (due_date !== undefined) update.due_date = due_date || null;
    const { data } = await supabase
      .from("entries")
      .update(update)
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

  const togglePaid = async (id: string, paid: boolean) => {
    const { data } = await supabase
      .from("entries")
      .update({ paid, paid_at: paid ? new Date().toISOString() : null, updated_by: user?.id ?? null })
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
    if (!user) return null;
    const max = Math.max(0, ...categories.map((c) => c.sort_order));
    const { data } = await supabase
      .from("categories")
      .insert({
        user_id: user.id,
        group_id: activeGroupId,
        created_by: user.id,
        updated_by: user.id,
        name,
        kind,
        parent_id,
        sort_order: max + 1,
      })
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
    due_day?: number | null,
  ) => {
    if (!user) return;
    const existing = recurring.find((r) => r.category_id === category_id);
    if (existing) {
      const { data } = await supabase
        .from("recurring_amounts")
        .update({
          amount,
          note: note ?? null,
          active: true,
          due_day: due_day ?? null,
          updated_by: user.id,
        })
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
        .insert({
          user_id: user.id,
          group_id: activeGroupId,
          created_by: user.id,
          updated_by: user.id,
          category_id,
          amount,
          note: note || null,
          active: true,
          due_day: due_day ?? null,
        })
        .select()
        .single();
      if (data)
        setRecurring((prev) => [
          ...prev,
          { ...(data as any), amount: Number((data as any).amount) },
        ]);
    }

    // Update existing entry of current month to reflect new due_date if applicable
    const day = due_day && due_day >= 1 && due_day <= 28 ? due_day : null;
    const existingEntry = entries.find((e) => e.category_id === category_id);
    if (existingEntry && day) {
      const newDue = new Date(year, month - 1, day).toISOString().slice(0, 10);
      if (existingEntry.due_date !== newDue) {
        await supabase
          .from("entries")
          .update({ due_date: newDue, updated_by: user.id })
          .eq("id", existingEntry.id);
        setEntries((prev) =>
          prev.map((e) =>
            e.id === existingEntry.id ? { ...e, due_date: newDue } : e,
          ),
        );
      }
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
    editorNames,
    loading,
    addEntry,
    updateEntry,
    togglePaid,
    deleteEntry,
    addCategory,
    deleteCategory,
    setRecurringForCategory,
    removeRecurringForCategory,
    reload: loadEntries,
  };
}
