import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Wallet,
  Download,
  HandCoins,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChartTooltip } from "@/components/finance/ChartTooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL, MONTHS_PT } from "@/lib/format";
import type { Category, Entry } from "@/hooks/use-finance";
import { useDebts } from "@/hooks/use-debts";

export const Route = createFileRoute("/visao-anual")({
  head: () => ({
    meta: [
      { title: "Visão Anual — Finanças da Família" },
      {
        name: "description",
        content:
          "Visão global dos gastos, receitas e poupança ao longo dos meses do ano.",
      },
    ],
  }),
  component: AnnualView,
});

function AnnualView() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [categories, setCategories] = useState<Category[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile, loading: authLoading } = useAuth();
  const { totalAt: debtTotalAt, payments: debtPayments } = useDebts();
  const navigate = useNavigate();
  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    setLoading(true);
    (async () => {
      if (!user) return;
      const scope = profile?.active_group_id
        ? `group_id.eq.${profile.active_group_id}`
        : `and(user_id.eq.${user.id},group_id.is.null)`;
      const [catsRes, entriesRes] = await Promise.all([
        supabase.from("categories").select("*").or(scope).order("sort_order"),
        supabase.from("entries").select("*").or(scope).eq("year", year),
      ]);
      if (catsRes.data) setCategories(catsRes.data as Category[]);
      if (entriesRes.data)
        setEntries(
          entriesRes.data.map((d: any) => ({
            ...d,
            amount: Number(d.amount),
          })) as Entry[],
        );
      setLoading(false);
    })();
  }, [year, user, profile?.active_group_id]);

  const { monthly, totals, byCategoryMonthly, topCats } = useMemo(() => {
    const START_YEAR = 2026;
    const START_MONTH = 5;
    const startMonth = year === START_YEAR ? START_MONTH : year < START_YEAR ? 13 : 1;
    const months = Array.from({ length: 12 }, (_, i) => i + 1).filter(
      (m) => m >= startMonth,
    );
    const byMonth = months.map((m) => {
      let income = 0,
        expense = 0,
        savings = 0;
      for (const e of entries) {
        if (e.month !== m) continue;
        const cat = categories.find((c) => c.id === e.category_id);
        if (!cat) continue;
        const root =
          categories.find((c) => c.id === (cat.parent_id ?? cat.id)) ?? cat;
        if (root.kind === "income") income += e.amount;
        else if (root.kind === "savings") savings += e.amount;
        else expense += e.amount;
      }
      const debtsPaid = debtPayments
        .filter((p) => p.year === year && p.month === m)
        .reduce((s, p) => s + p.amount, 0);
      return {
        month: m,
        name: MONTHS_PT[m - 1].slice(0, 3),
        Receitas: income,
        Gastos: expense,
        Poupado: savings,
        Dívidas: debtTotalAt(year, m),
        "Pago em dívidas": debtsPaid,
        Saldo: income - expense - debtsPaid,
      };
    });

    const t = byMonth.reduce(
      (acc, m) => {
        acc.income += m.Receitas;
        acc.expense += m.Gastos;
        acc.savings += m.Poupado;
        acc.debtsPaid += m["Pago em dívidas"];
        return acc;
      },
      { income: 0, expense: 0, savings: 0, debtsPaid: 0 },
    );

    // expense by root category, monthly
    const rootExp = categories.filter(
      (c) => !c.parent_id && c.kind === "expense",
    );
    const totalsByRoot: Record<string, number> = {};
    for (const e of entries) {
      const cat = categories.find((c) => c.id === e.category_id);
      if (!cat) continue;
      const root =
        categories.find((c) => c.id === (cat.parent_id ?? cat.id)) ?? cat;
      if (root.kind !== "expense") continue;
      totalsByRoot[root.id] = (totalsByRoot[root.id] || 0) + e.amount;
    }
    const top = rootExp
      .map((c) => ({ id: c.id, name: c.name, total: totalsByRoot[c.id] || 0 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const byCatMonthly = months.map((m) => {
      const row: Record<string, number | string> = {
        name: MONTHS_PT[m - 1].slice(0, 3),
      };
      for (const tc of top) {
        let v = 0;
        for (const e of entries) {
          if (e.month !== m) continue;
          const cat = categories.find((c) => c.id === e.category_id);
          if (!cat) continue;
          const root =
            categories.find((c) => c.id === (cat.parent_id ?? cat.id)) ?? cat;
          if (root.id === tc.id) v += e.amount;
        }
        row[tc.name] = v;
      }
      return row;
    });

    return {
      monthly: byMonth,
      totals: t,
      byCategoryMonthly: byCatMonthly,
      topCats: top,
    };
  }, [entries, categories, year, debtPayments, debtTotalAt]);

  const balance =
    totals.income - totals.expense - totals.debtsPaid;
  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  const summary = [
    {
      label: "Receitas no ano",
      value: totals.income,
      icon: TrendingUp,
      iconColor: "text-income",
      accent: "from-income/30 to-accent/20",
    },
    {
      label: "Gastos no ano",
      value: totals.expense,
      icon: TrendingDown,
      iconColor: "text-destructive",
      accent: "from-destructive/30 to-warning/10",
    },
    {
      label: "Poupado no ano",
      value: totals.savings,
      icon: PiggyBank,
      iconColor: "text-savings",
      accent: "from-savings/30 to-accent/20",
    },
    {
      label: "Pago em dívidas",
      value: totals.debtsPaid,
      icon: HandCoins,
      iconColor: "text-destructive",
      accent: "from-destructive/20 to-warning/10",
    },
    {
      label: "Saldo do ano",
      value: balance,
      icon: Wallet,
      iconColor: balance >= 0 ? "text-income" : "text-destructive",
      accent: "from-primary/30 to-accent/20",
    },
  ];

  const CHART_COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ];

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon" className="rounded-xl">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                Visão anual
              </h1>
              <p className="text-xs text-muted-foreground">
                Acompanhe a evolução dos seus gastos no ano
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl gap-1.5"
              onClick={() => {
                const header = [
                  "Mês",
                  "Receitas",
                  "Gastos",
                  "Poupado",
                  "Dívidas",
                  "Pago em dívidas",
                  "Saldo",
                ];
                const rows = monthly.map((m) => [
                  MONTHS_PT[m.month - 1],
                  m.Receitas.toFixed(2).replace(".", ","),
                  m.Gastos.toFixed(2).replace(".", ","),
                  m.Poupado.toFixed(2).replace(".", ","),
                  m["Dívidas"].toFixed(2).replace(".", ","),
                  m["Pago em dívidas"].toFixed(2).replace(".", ","),
                  m.Saldo.toFixed(2).replace(".", ","),
                ]);
                const totalRow = [
                  "Total",
                  totals.income.toFixed(2).replace(".", ","),
                  totals.expense.toFixed(2).replace(".", ","),
                  totals.savings.toFixed(2).replace(".", ","),
                  "",
                  totals.debtsPaid.toFixed(2).replace(".", ","),
                  balance.toFixed(2).replace(".", ","),
                ];
                const csv =
                  "\ufeff" +
                  [header, ...rows, totalRow]
                    .map((r) =>
                      r
                        .map((v) => {
                          const s = String(v);
                          return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
                        })
                        .join(";"),
                    )
                    .join("\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `visao-anual-${year}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-28 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {summary.map((c) => (
            <div
              key={c.label}
              className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-elegant)]"
            >
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${c.accent} opacity-60`}
              />
              <div className="relative flex items-start justify-between">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {c.label}
                  </div>
                  <div className="mt-1.5 text-base font-bold tracking-tight sm:text-lg">
                    {formatBRL(c.value)}
                  </div>
                </div>
                <div className={`rounded-xl bg-background/60 p-2 ${c.iconColor}`}>
                  <c.icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
            Carregando...
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-elegant)]">
              <h3 className="mb-4 text-sm font-semibold tracking-tight">
                Receitas vs Gastos vs Poupado por mês
              </h3>
              <div className="annual-bar-chart h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly} margin={{ left: -10, right: 8, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                    <Tooltip content={<ChartTooltip />} cursor={false} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar
                      dataKey="Receitas"
                      fill="var(--income)"
                      radius={[6, 6, 0, 0]}
                      activeBar={{ stroke: "var(--income)", strokeWidth: 4 }}
                    />
                    <Bar
                      dataKey="Gastos"
                      fill="var(--destructive)"
                      radius={[6, 6, 0, 0]}
                      activeBar={{ stroke: "var(--destructive)", strokeWidth: 4 }}
                    />
                    <Bar
                      dataKey="Poupado"
                      fill="var(--savings)"
                      radius={[6, 6, 0, 0]}
                      activeBar={{ stroke: "var(--savings)", strokeWidth: 4 }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-elegant)]">
              <h3 className="mb-4 text-sm font-semibold tracking-tight">
                Evolução do saldo mensal
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthly} margin={{ left: -10, right: 8, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: "0.75rem",
                      }}
                      formatter={(v) => formatBRL(Number(v))}
                    />
                    <Line
                      type="monotone"
                      dataKey="Saldo"
                      stroke="var(--primary)"
                      strokeWidth={3}
                      dot={{ fill: "var(--primary)", r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-elegant)]">
              <h3 className="mb-4 text-sm font-semibold tracking-tight">
                Evolução das dívidas
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthly} margin={{ left: -10, right: 8, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: "0.75rem",
                      }}
                      formatter={(v) => formatBRL(Number(v))}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line
                      type="monotone"
                      dataKey="Dívidas"
                      stroke="var(--warning)"
                      strokeWidth={3}
                      dot={{ fill: "var(--warning)", r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Pago em dívidas"
                      stroke="var(--destructive)"
                      strokeWidth={2}
                      dot={{ fill: "var(--destructive)", r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {topCats.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-elegant)]">
                <h3 className="mb-4 text-sm font-semibold tracking-tight">
                  Top categorias de gasto — mês a mês
                </h3>
                <div className="annual-bar-chart h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={byCategoryMonthly}
                      margin={{ left: -10, right: 8, top: 4, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                      <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                      <Tooltip content={<ChartTooltip />} cursor={false} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {topCats.map((c, i) => (
                        <Bar
                          key={c.id}
                          dataKey={c.name}
                          stackId="a"
                          fill={CHART_COLORS[i % CHART_COLORS.length]}
                          activeBar={{
                            stroke: CHART_COLORS[i % CHART_COLORS.length],
                            strokeWidth: 4,
                          }}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-elegant)]">
              <h3 className="border-b border-border px-4 py-3 text-sm font-semibold tracking-tight">
                Resumo mês a mês
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left">Mês</th>
                      <th className="px-4 py-2 text-right">Receitas</th>
                      <th className="px-4 py-2 text-right">Gastos</th>
                      <th className="px-4 py-2 text-right">Poupado</th>
                      <th className="px-4 py-2 text-right">Dívidas</th>
                      <th className="px-4 py-2 text-right">Pago em dívidas</th>
                      <th className="px-4 py-2 text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthly.map((m) => (
                      <tr key={m.month} className="border-t border-border">
                        <td className="px-4 py-2 font-medium">{m.name}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-income">
                          {formatBRL(m.Receitas)}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-destructive">
                          {formatBRL(m.Gastos)}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-savings">
                          {formatBRL(m.Poupado)}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-warning">
                          {formatBRL(m["Dívidas"])}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-destructive">
                          {formatBRL(m["Pago em dívidas"])}
                        </td>
                        <td
                          className={`px-4 py-2 text-right font-semibold tabular-nums ${m.Saldo >= 0 ? "text-income" : "text-destructive"}`}
                        >
                          {formatBRL(m.Saldo)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
