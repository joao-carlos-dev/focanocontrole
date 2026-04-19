import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { useFinance } from "@/hooks/use-finance";
import { MonthSelector } from "@/components/finance/MonthSelector";
import { SummaryCards } from "@/components/finance/SummaryCards";
import { CategoryChart } from "@/components/finance/CategoryChart";
import { CategoryRow } from "@/components/finance/CategoryRow";
import { AddCategoryDialog } from "@/components/finance/AddCategoryDialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Controle Financeiro Familiar" },
      {
        name: "description",
        content:
          "Dashboard de controle de gastos e poupança da família, simples e editável.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const {
    categories,
    entries,
    loading,
    addEntry,
    updateEntry,
    deleteEntry,
    addCategory,
    deleteCategory,
  } = useFinance(year, month);

  const { rootExpenses, savings, totalExpense, totalSavings } = useMemo(() => {
    const roots = categories.filter((c) => !c.parent_id);
    const rootExp = roots.filter((c) => c.kind === "expense");
    const sav = roots.filter((c) => c.kind === "savings");

    let totalExp = 0;
    let totalSav = 0;
    for (const e of entries) {
      const cat = categories.find((c) => c.id === e.category_id);
      if (!cat) continue;
      const root =
        categories.find((c) => c.id === (cat.parent_id ?? cat.id)) ?? cat;
      if (root.kind === "savings") totalSav += e.amount;
      else totalExp += e.amount;
    }
    return {
      rootExpenses: rootExp,
      savings: sav,
      totalExpense: totalExp,
      totalSavings: totalSav,
    };
  }, [categories, entries]);

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]">
              <Wallet className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                Finanças da família
              </h1>
              <p className="text-xs text-muted-foreground">
                Acompanhe gastos e poupança mês a mês
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MonthSelector
              year={year}
              month={month}
              onChange={(y, m) => {
                setYear(y);
                setMonth(m);
              }}
            />
          </div>
        </header>

        <SummaryCards totalExpense={totalExpense} totalSavings={totalSavings} />

        <CategoryChart categories={categories} entries={entries} />

        {/* Expenses */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Gastos
            </h2>
            <AddCategoryDialog categories={categories} onAdd={addCategory} />
          </div>
          {loading ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : (
            <div className="space-y-2.5">
              {rootExpenses.map((cat) => {
                const subs = categories.filter((c) => c.parent_id === cat.id);
                return (
                  <CategoryRow
                    key={cat.id}
                    category={cat}
                    subcategories={subs}
                    entries={entries}
                    allEntries={entries}
                    onAddEntry={addEntry}
                    onUpdateEntry={updateEntry}
                    onDeleteEntry={deleteEntry}
                    onDeleteCategory={deleteCategory}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* Savings */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-savings">
            Guardar dinheiro
          </h2>
          <div className="space-y-2.5">
            {savings.map((cat) => (
              <CategoryRow
                key={cat.id}
                category={cat}
                subcategories={[]}
                entries={entries}
                allEntries={entries}
                onAddEntry={addEntry}
                onUpdateEntry={updateEntry}
                onDeleteEntry={deleteEntry}
                onDeleteCategory={deleteCategory}
              />
            ))}
          </div>
        </section>

        <footer className="pt-4 text-center text-xs text-muted-foreground">
          Dados sincronizados na nuvem ✨
        </footer>
      </div>
    </div>
  );
}
