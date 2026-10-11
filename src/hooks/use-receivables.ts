import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type Receivable = {
  id: string;
  description: string;
  amount: number;
  sort_order: number;
  created_by: string | null;
  updated_by: string | null;
  start_year: number | null;
  start_month: number | null;
};

export type ReceivablePayment = {
  id: string;
  receivable_id: string;
  amount: number;
  note: string | null;
  year: number;
  month: number;
  payment_date: string;
};

const key = (y: number, m: number) => y * 12 + m;

// Same logic as debts, but for money lent to other people. The balance never
// affects the monthly balance by itself — only the amounts the user registers
// as received are added, and only in the month they were received.
export function useReceivables(year?: number, month?: number) {
  const { user, profile } = useAuth();
  const activeGroupId = profile?.active_group_id ?? null;
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [payments, setPayments] = useState<ReceivablePayment[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const selYear = year ?? now.getFullYear();
  const selMonth = month ?? now.getMonth() + 1;

  const db = () => (supabase as any).from("receivables");

  const scope = activeGroupId
    ? `group_id.eq.${activeGroupId}`
    : user
      ? `and(user_id.eq.${user.id},group_id.is.null)`
      : "";

  const load = useCallback(async () => {
    if (!user) {
      setReceivables([]);
      setPayments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [recRes, paysRes] = await Promise.all([
      (supabase as any)
        .from("receivables")
        .select("*")
        .or(scope)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      (supabase as any)
        .from("receivable_payments")
        .select("*")
        .or(scope)
        .order("payment_date", { ascending: true }),
    ]);
    setReceivables(
      ((recRes.data || []) as any[]).map((d) => ({
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

  const visibleReceivables = useMemo(
    () =>
      receivables.filter((d) => {
        if (!d.start_year || !d.start_month) return true;
        return key(d.start_year, d.start_month) <= key(selYear, selMonth);
      }),
    [receivables, selYear, selMonth],
  );

  const balanceAt = useCallback(
    (receivableId: string, y: number, m: number) => {
      const rec = receivables.find((d) => d.id === receivableId);
      if (!rec) return 0;
      const receivedAfter = payments
        .filter(
          (p) => p.receivable_id === receivableId && key(p.year, p.month) > key(y, m),
        )
        .reduce((s, p) => s + p.amount, 0);
      return rec.amount + receivedAfter;
    },
    [receivables, payments],
  );

  const totalAt = useCallback(
    (y: number, m: number) =>
      receivables
        .filter((d) =>
          !d.start_year || !d.start_month
            ? true
            : key(d.start_year, d.start_month) <= key(y, m),
        )
        .reduce((s, d) => s + balanceAt(d.id, y, m), 0),
    [receivables, balanceAt],
  );

  const addReceivable = async (description: string, amount: number) => {
    if (!user) return;
    const max = Math.max(0, ...receivables.map((d) => d.sort_order));
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
      setReceivables((prev) => [
        ...prev,
        { ...(data as any), amount: Number((data as any).amount) },
      ]);
    return data ? (data as any).id : null;
  };


  const updateReceivable = async (
    id: string,
    description: string,
    amount: number,
  ) => {
    const { data } = await db()
      .update({ description, amount, updated_by: user?.id ?? null })
      .eq("id", id)
      .select()
      .single();
    if (data)
      setReceivables((prev) =>
        prev.map((d) =>
          d.id === id
            ? { ...(data as any), amount: Number((data as any).amount) }
            : d,
        ),
      );
  };

  const deleteReceivable = async (id: string) => {
    await db().delete().eq("id", id);
    setReceivables((prev) => prev.filter((d) => d.id !== id));
    setPayments((prev) => prev.filter((p) => p.receivable_id !== id));
  };

  // Registering a receipt lowers the receivable balance and is added to the
  // balance of the month it was received in.
  const receivePayment = async (id: string, amount: number, note?: string) => {
    if (!user || amount <= 0) return;
    const rec = receivables.find((d) => d.id === id);
    if (!rec) return;
    const value = Math.min(amount, rec.amount);
    const { data: pay } = await (supabase as any)
      .from("receivable_payments")
      .insert({
        receivable_id: id,
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
        amount: Math.max(0, rec.amount - value),
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
      setReceivables((prev) =>
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
    const rec = receivables.find((d) => d.id === pay.receivable_id);
    await (supabase as any)
      .from("receivable_payments")
      .delete()
      .eq("id", paymentId);
    if (rec) {
      await db()
        .update({ amount: rec.amount + pay.amount, updated_by: user?.id ?? null })
        .eq("id", rec.id);
      setReceivables((prev) =>
        prev.map((d) =>
          d.id === rec.id ? { ...d, amount: d.amount + pay.amount } : d,
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

  const total = useMemo(
    () => totalAt(selYear, selMonth),
    [totalAt, selYear, selMonth],
  );

  return {
    receivables: visibleReceivables,
    allReceivables: receivables,
    payments,
    monthPayments,
    monthPaymentsTotal,
    total,
    totalAt,
    balanceAt,
    loading,
    addReceivable,
    updateReceivable,
    deleteReceivable,
    receivePayment,
    deletePayment,
    reload: load,
  };
}
