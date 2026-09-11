import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type Debt = {
  id: string;
  description: string;
  amount: number;
  sort_order: number;
  created_by: string | null;
  updated_by: string | null;
};

// The debts table is not month-scoped on purpose: a debt is a current balance,
// and it never affects the monthly balance — it only changes when the user
// lowers its value.
export function useDebts() {
  const { user, profile } = useAuth();
  const activeGroupId = profile?.active_group_id ?? null;
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);

  const db = () => (supabase as any).from("debts");

  const load = useCallback(async () => {
    if (!user) {
      setDebts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("debts")
      .select("*")
      .or(
        activeGroupId
          ? `group_id.eq.${activeGroupId}`
          : `and(user_id.eq.${user.id},group_id.is.null)`,
      )
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    setDebts(
      ((data || []) as any[]).map((d) => ({ ...d, amount: Number(d.amount) })),
    );
    setLoading(false);
  }, [user, activeGroupId]);

  useEffect(() => {
    load();
  }, [load]);

  const addDebt = async (description: string, amount: number) => {
    if (!user) return;
    const max = Math.max(0, ...debts.map((d) => d.sort_order));
    const { data } = await db()
      .insert({
        user_id: user.id,
        group_id: activeGroupId,
        created_by: user.id,
        updated_by: user.id,
        description,
        amount,
        sort_order: max + 1,
      })
      .select()
      .single();
    if (data)
      setDebts((prev) => [...prev, { ...(data as any), amount: Number((data as any).amount) }]);
  };

  const updateDebt = async (id: string, description: string, amount: number) => {
    const { data } = await db()
      .update({ description, amount, updated_by: user?.id ?? null })
      .eq("id", id)
      .select()
      .single();
    if (data)
      setDebts((prev) =>
        prev.map((d) =>
          d.id === id ? { ...(data as any), amount: Number((data as any).amount) } : d,
        ),
      );
  };

  const deleteDebt = async (id: string) => {
    await db().delete().eq("id", id);
    setDebts((prev) => prev.filter((d) => d.id !== id));
  };

  const total = debts.reduce((sum, d) => sum + (d.amount || 0), 0);

  return { debts, total, loading, addDebt, updateDebt, deleteDebt, reload: load };
}
