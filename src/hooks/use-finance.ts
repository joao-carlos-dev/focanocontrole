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

const SKIP_KEY = "finance:skipped_recurring";
const HIDDEN_KEY = "finance:hidden_categories_month";

const readSkipped = (): Record<string, true> => {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(SKIP_KEY) || "{}");
  } catch {
    return {};
  }
};
const writeSkipped = (s: Record<string, true>) => {
  try {
    localStorage.setItem(SKIP_KEY, JSON.stringify(s));
  } catch {}
};
const readHidden = (): Record<string, true> => {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(HIDDEN_KEY) || "{}");
  } catch {
    return {};
  }
};
const writeHidden = (s: Record<string, true>) => {
  try {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(s));
  } catch {}
};
const skipKey = (scope: string, categoryId: string, year: number, month: number) =>
  `${scope}:${categoryId}:${year}-${month}`;

export function useFinance(year: number, month: number) {
  const { user, profile } = useAuth();
  const activeGroupId = profile?.active_group_id ?? null;
  const scopeKey = activeGroupId ?? user?.id ?? "anon";
  const [categories, setCategories] = useState<Category[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [editorNames, setEditorNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const hidden = readHidden();
    const ids = new Set<string>();
    for (const c of categories) {
      if (hidden[skipKey(scopeKey, c.id, year, month)]) ids.add(c.id);
    }
    setHiddenIds(ids);
  }, [categories, year, month, scopeKey]);

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
        (data || []).map((d: any) => ({ ...d, amount: Number(d.amount) })) as Entry[],
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
      const skipped = readSkipped();
      const existingCategoryIds = new Set(existing.map((e) => e.category_id));
      const toInsert = recList
        .filter(
          (r) =>
            r.active &&
            !existingCategoryIds.has(r.category_id) &&
            !skipped[skipKey(scopeKey, r.category_id, year, month)],
        )
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
    [year, month, user, activeGroupId, scopeKey],
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

  const syncRecurringAmount = async (
    category_id: string,
    amount: number,
    note?: string | null,
  ) => {
    if (!user) return;
    const existing = recurring.find((r) => r.category_id === category_id);
    if (!existing) return;
    const { data } = await supabase
      .from("recurring_amounts")
      .update({
        amount,
        note: note ?? null,
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

    // Propagate the new value/note to every other month's entry that
    // already exists for this recurring category (current year + future).
    await supabase
      .from("entries")
      .update({ amount, note: note ?? null, updated_by: user.id })
      .eq("category_id", category_id)
      .or(
        `and(year.eq.${year},month.gt.${month}),year.gt.${year}`,
      );

    // Also CREATE entries for any future month of the current year that
    // doesn't have one yet, so fixed accounts show their value everywhere.
    await propagateRecurringToYear(
      category_id,
      amount,
      note ?? null,
      existing.due_day ?? null,
    );
  };

  // Create entries for every month of the current year that doesn't have one
  // yet (and isn't explicitly skipped), so fixed accounts show up everywhere.
  const propagateRecurringToYear = async (
    category_id: string,
    amount: number,
    note: string | null,
    due_day: number | null,
  ) => {
    if (!user) return;
    // Check which months already have an entry for this category in this year.
    const { data: existing } = await supabase
      .from("entries")
      .select("month")
      .eq("category_id", category_id)
      .eq("year", year)
      .or(activeGroupId ? `group_id.eq.${activeGroupId}` : `and(user_id.eq.${user.id},group_id.is.null)`);
    const existingMonths = new Set((existing || []).map((e: any) => e.month));
    const skipped = readSkipped();
    const day = due_day && due_day >= 1 && due_day <= 28 ? due_day : null;

    const rows: any[] = [];
    for (let m = 1; m <= 12; m++) {
      if (existingMonths.has(m)) continue;
      if (skipped[skipKey(scopeKey, category_id, year, m)]) continue;
      const due = day
        ? new Date(year, m - 1, day).toISOString().slice(0, 10)
        : null;
      rows.push({
        user_id: user.id,
        group_id: activeGroupId,
        created_by: user.id,
        updated_by: user.id,
        category_id,
        amount,
        note: note || null,
        month: m,
        year,
        entry_date: new Date(year, m - 1, 1).toISOString().slice(0, 10),
        due_date: due,
        paid: false,
      });
    }
    if (rows.length === 0) return;
    const { data } = await supabase.from("entries").insert(rows).select();
    if (data) {
      // Only the entries that match the currently viewed month should be
      // merged into local state.
      setEntries((prev) => [
        ...prev,
        ...data
          .filter((d: any) => d.month === month && d.year === year)
          .map((d: any) => ({ ...d, amount: Number(d.amount) })),
      ]);
    }
  };

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
    if (data) {
      const skipped = readSkipped();
      const k = skipKey(scopeKey, category_id, year, month);
      if (skipped[k]) {
        delete skipped[k];
        writeSkipped(skipped);
      }
      // Adding a value for a category should un-hide it for this month.
      const hidden = readHidden();
      const cat = categories.find((c) => c.id === category_id);
      const parentId = cat?.parent_id ?? null;
      let changed = false;
      const hk = skipKey(scopeKey, category_id, year, month);
      if (hidden[hk]) { delete hidden[hk]; changed = true; }
      if (parentId) {
        const pk = skipKey(scopeKey, parentId, year, month);
        if (hidden[pk]) { delete hidden[pk]; changed = true; }
      }
      if (changed) {
        writeHidden(hidden);
        setHiddenIds((prev) => {
          const next = new Set(prev);
          next.delete(category_id);
          if (parentId) next.delete(parentId);
          return next;
        });
      }
      setEntries((prev) => [
        ...prev,
        { ...(data as any), amount: Number((data as any).amount) },
      ]);
      await syncRecurringAmount(category_id, amount, note);
    }
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
    if (data) {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...(data as any), amount: Number((data as any).amount) }
            : e,
        ),
      );
      await syncRecurringAmount((data as any).category_id, amount, note);
    }
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
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;

    // Hard delete the single row for this specific month only.
    await supabase
      .from("entries")
      .delete()
      .eq("id", id)
      .eq("year", entry.year)
      .eq("month", entry.month);

    // If this category has a recurring template, remember that the user
    // chose to skip it for this month so we don't auto-recreate it.
    const isRecurringEntry = recurring.some((r) => r.category_id === entry.category_id);
    if (isRecurringEntry) {
      const skipped = readSkipped();
      skipped[skipKey(scopeKey, entry.category_id, entry.year, entry.month)] = true;
      writeSkipped(skipped);
    }

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
    if (!user) return;

    // In the dashboard, "excluir gasto" must affect only the selected month.
    // Keep the category and all previous/future months intact.
    const categoryIds = [
      id,
      ...categories.filter((c) => c.parent_id === id).map((c) => c.id),
    ];

    await supabase
      .from("entries")
      .delete()
      .in("category_id", categoryIds)
      .eq("year", year)
      .eq("month", month)
      .or(activeGroupId ? `group_id.eq.${activeGroupId}` : `and(user_id.eq.${user.id},group_id.is.null)`);

    const recurringCategoryIds = categoryIds.filter((categoryId) =>
      recurring.some((r) => r.category_id === categoryId),
    );
    if (recurringCategoryIds.length > 0) {
      const skipped = readSkipped();
      for (const categoryId of recurringCategoryIds) {
        skipped[skipKey(scopeKey, categoryId, year, month)] = true;
      }
      writeSkipped(skipped);
    }

    setEntries((prev) =>
      prev.filter(
        (e) =>
          !categoryIds.includes(e.category_id) ||
          e.year !== year ||
          e.month !== month,
      ),
    );
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

    // Ensure the current month reflects the recurring value:
    // - if an entry already exists, update amount/note/due_date
    // - if no entry exists, create one for this month using the recurring values
    const day = due_day && due_day >= 1 && due_day <= 28 ? due_day : null;
    const newDue = day
      ? new Date(year, month - 1, day).toISOString().slice(0, 10)
      : null;
    const existingEntry = entries.find((e) => e.category_id === category_id);

    // Clear the "skip this recurring for this month" flag so the value shows up.
    const skipped = readSkipped();
    const sk = skipKey(scopeKey, category_id, year, month);
    if (skipped[sk]) {
      delete skipped[sk];
      writeSkipped(skipped);
    }

    if (existingEntry) {
      const update: any = {
        amount,
        note: note ?? null,
        updated_by: user.id,
      };
      if (newDue) update.due_date = newDue;
      const { data: upd } = await supabase
        .from("entries")
        .update(update)
        .eq("id", existingEntry.id)
        .select()
        .single();
      if (upd)
        setEntries((prev) =>
          prev.map((e) =>
            e.id === existingEntry.id
              ? { ...(upd as any), amount: Number((upd as any).amount) }
              : e,
          ),
        );
    } else {
      const { data: ins } = await supabase
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
          entry_date: new Date(year, month - 1, 1).toISOString().slice(0, 10),
          due_date: newDue,
          paid: false,
        })
        .select()
        .single();
      if (ins)
        setEntries((prev) => [
          ...prev,
          { ...(ins as any), amount: Number((ins as any).amount) },
        ]);
    }

    // Make sure this fixed value shows up in every other month of the year too.
    await propagateRecurringToYear(category_id, amount, note ?? null, due_day ?? null);
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
