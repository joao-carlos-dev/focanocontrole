import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type Debt = {
  id: string;
  description: string;
  amount: number;
  sort_order: number;
  created_by: string | null;
  updated_by: string | null;
  start_year: number | null;
  start_month: number | null;
};

export type DebtPayment = {
  id: string;
  debt_id: string;
  amount: number;
  note: string | null;
  year: number;
  month: number;
  payment_date: string;
};

const key = (y: number, m: number) => y * 12 + m;

// The debts table is not month-scoped on purpose: a debt is a current balance.
// It never affects the monthly balance by itself — only the payments the user
// registers are discounted, and only in the month they were made.
export function useDebts(year?: number, month?: number) {
  const { user, profile } = useAuth();
  const activeGroupId = profile?.active_group_id ?? null;
  const [debts, setDebts] = useState<Debt[]>([]);
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const selYear = year ?? now.getFullYear();
  const selMonth = month ?? now.getMonth() + 1;

  const db = () => (supabase as any).from("debts");

  const scope = activeGroupId
    ? `group_id.eq.${activeGroupId}`
    : user
      ? `and(user_id.eq.${user.id},group_id.is.null)`
      : "";

  const load = useCallback(async () => {
    if (!user) {
      setDebts([]);
      setPayments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [debtsRes, paysRes] = await Promise.all([
      (supabase as any)
        .from("debts")
        .select("*")
        .or(scope)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      (supabase as any)
        .from("debt_payments")
        .select("*")
        .or(scope)
        .order("payment_date", { ascending: true }),
    ]);
    setDebts(
      ((debtsRes.data || []) as any[]).map((d) => ({
        ...d,
        amount: Number(d.amount),
      })),
    );
    setPayments(
      ((paysRes.data || []) as any[]).map((p) => ({
        ...p,
        amount: Number(p.amount),
      })),
    );
    setLoading(false);
  }, [user, scope]);

  useEffect(() => {
    load();
  }, [load]);

  // Debts only exist from the month they were created onwards — past months
  // are never touched.
  const visibleDebts = useMemo(
    () =>
      debts.filter((d) => {
        if (!d.start_year || !d.start_month) return true;
        return key(d.start_year, d.start_month) <= key(selYear, selMonth);
      }),
    [debts, selYear, selMonth],
  );

  // Balance of a debt as it was at the end of a given month: current balance
  // plus everything paid after that month.
  const balanceAt = useCallback(
    (debtId: string, y: number, m: number) => {
      const debt = debts.find((d) => d.id === debtId);
      if (!debt) return 0;
      const paidAfter = payments
        .filter((p) => p.debt_id === debtId && key(p.year, p.month) > key(y, m))
        .reduce((s, p) => s + p.amount, 0);
      return debt.amount + paidAfter;
    },
    [debts, payments],
  );

  const totalAt = useCallback(
    (y: number, m: number) =>
      debts
        .filter((d) =>
          !d.start_year || !d.start_month
            ? true
            : key(d.start_year, d.start_month) <= key(y, m),
        )
        .reduce((s, d) => s + balanceAt(d.id, y, m), 0),
    [debts, balanceAt],
  );

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
        start_year: selYear,
        start_month: selMonth,
      })
      .select()
      .single();
    if (data)
      setDebts((prev) => [
        ...prev,
        { ...(data as any), amount: Number((data as any).amount) },
      ]);
    return data ? (data as any).id : null;
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
          d.id === id
            ? { ...(data as any), amount: Number((data as any).amount) }
            : d,
        ),
      );
  };

  const deleteDebt = async (id: string) => {
    await db().delete().eq("id", id);
    setDebts((prev) => prev.filter((d) => d.id !== id));
    setPayments((prev) => prev.filter((p) => p.debt_id !== id));
  };

  // Registering a payment lowers the debt balance and is discounted from the
  // balance of the month it was made in.
  const payDebt = async (id: string, amount: number, note?: string) => {
    if (!user || amount <= 0) return;
    const debt = debts.find((d) => d.id === id);
    if (!debt) return;
    const value = Math.min(amount, debt.amount);
    const { data: pay } = await (supabase as any)
      .from("debt_payments")
      .insert({
        debt_id: id,
        user_id: user.id,
        group_id: activeGroupId,
        created_by: user.id,
        amount: value,
        note: note ?? null,
        year: selYear,
        month: selMonth,
      })
      .select()
      .single();
    const { data: updated } = await db()
      .update({
        amount: Math.max(0, debt.amount - value),
        updated_by: user.id,
      })
      .eq("id", id)
      .select()
      .single();
    if (pay)
      setPayments((prev) => [
        ...prev,
        { ...(pay as any), amount: Number((pay as any).amount) },
      ]);
    if (updated)
      setDebts((prev) =>
        prev.map((d) =>
          d.id === id
            ? { ...(updated as any), amount: Number((updated as any).amount) }
            : d,
        ),
      );
  };

  const deletePayment = async (paymentId: string) => {
    const pay = payments.find((p) => p.id === paymentId);
    if (!pay) return;
    const debt = debts.find((d) => d.id === pay.debt_id);
    await (supabase as any).from("debt_payments").delete().eq("id", paymentId);
    if (debt) {
      await db()
        .update({ amount: debt.amount + pay.amount, updated_by: user?.id ?? null })
        .eq("id", debt.id);
      setDebts((prev) =>
        prev.map((d) =>
          d.id === debt.id ? { ...d, amount: d.amount + pay.amount } : d,
        ),
      );
    }
    setPayments((prev) => prev.filter((p) => p.id !== paymentId));
  };

  const monthPayments = useMemo(
    () => payments.filter((p) => p.year === selYear && p.month === selMonth),
    [payments, selYear, selMonth],
  );
  const monthPaymentsTotal = monthPayments.reduce((s, p) => s + p.amount, 0);

  const total = useMemo(() => totalAt(selYear, selMonth), [totalAt, selYear, selMonth]);

  return {
    debts: visibleDebts,
    allDebts: debts,
    payments,
    monthPayments,
    monthPaymentsTotal,
    total,
    totalAt,
    balanceAt,
    loading,
    addDebt,
    updateDebt,
    deleteDebt,
    payDebt,
    deletePayment,
    reload: load,
  };
}
