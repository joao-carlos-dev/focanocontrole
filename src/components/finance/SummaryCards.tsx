import {
  TrendingDown,
  PiggyBank,
  Wallet,
  TrendingUp,
  Landmark,
  HandCoins,
} from "lucide-react";
import { formatBRL } from "@/lib/format";

interface Props {
  totalIncome: number;
  totalExpense: number;
  totalSavings: number;
  totalDebts: number;
  debtPayments: number;
  totalReceivables: number;
  receivedPayments: number;
}

export function SummaryCards({
  totalIncome,
  totalExpense,
  totalSavings,
  totalDebts,
  debtPayments,
  totalReceivables,
  receivedPayments,
}: Props) {
  // Investimentos (poupado) não reduzem o saldo do mês — é dinheiro guardado, não gasto.
  // Valores recebidos de empréstimos entram no saldo do mês em que foram recebidos.
  const balance = totalIncome - totalExpense - debtPayments + receivedPayments;
  const cards = [
    {
      label: "Receitas",
      value: totalIncome,
      icon: TrendingUp,
      accent: "from-income/30 to-accent/20",
      iconColor: "text-income",
    },
    {
      label: "Gastos",
      value: totalExpense,
      icon: TrendingDown,
      accent: "from-destructive/30 to-warning/10",
      iconColor: "text-destructive",
    },
    {
      label: "Poupado",
      value: totalSavings,
      icon: PiggyBank,
      accent: "from-savings/30 to-accent/20",
      iconColor: "text-savings",
    },
    {
      label: "Saldo do mês",
      value: balance,
      icon: Wallet,
      accent: "from-primary/30 to-accent/20",
      iconColor: balance >= 0 ? "text-income" : "text-destructive",
    },
    {
      label: "Dívidas",
      value: totalDebts,
      icon: Landmark,
      accent: "from-warning/30 to-warning/10",
      iconColor: "text-warning",
    },
    {
      label: "Pago em dívidas",
      value: debtPayments,
      icon: HandCoins,
      accent: "from-destructive/20 to-warning/10",
      iconColor: "text-destructive",
    },
    {
      label: "A receber",
      value: totalReceivables,
      icon: HandCoins,
      accent: "from-income/20 to-accent/10",
      iconColor: "text-income",
    },
  ];

  return (
    <div aria-label="Resumo financeiro" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-elegant)]"
        >
          <div
            className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${c.accent} opacity-60`}
          />
          <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
            <div className="min-w-0">
              <div className="text-xs font-medium uppercase text-muted-foreground">
                {c.label}
              </div>
              <div className="mt-1.5 break-words text-base font-bold tabular-nums sm:text-lg">
                {formatBRL(c.value)}
              </div>
            </div>
            <div className={`shrink-0 rounded-xl bg-background/60 p-2 ${c.iconColor}`}>
              <c.icon className="h-5 w-5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
