import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Wallet, BarChart3, User as UserIcon, LogOut } from "lucide-react";
import { useFinance } from "@/hooks/use-finance";
import { useAuth } from "@/hooks/use-auth";
import { useDebts } from "@/hooks/use-debts";
import { MonthSelector } from "@/components/finance/MonthSelector";
import { SummaryCards } from "@/components/finance/SummaryCards";
import { CategoryChart } from "@/components/finance/CategoryChart";
import { CategoryRow } from "@/components/finance/CategoryRow";
import { AddCategoryDialog } from "@/components/finance/AddCategoryDialog";
import { DebtsSection } from "@/components/finance/DebtsSection";
import { Button } from "@/components/ui/button";


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
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [user, authLoading, navigate]);

  const {
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
    restoreCategoryForMonth,
    hiddenIds,
    setRecurringForCategory,
    removeRecurringForCategory,
  } = useFinance(year, month);

  const { rootExpenses, savings, incomes, totalExpense, totalSavings, totalIncome } = useMemo(() => {
    const roots = categories.filter((c) => !c.parent_id);
    const recurringCatIds = new Set(recurring.filter((r) => r.active).map((r) => r.category_id));
    const isPinned = (cat: typeof categories[number]) => {
      if (recurringCatIds.has(cat.id)) return true;
      return categories.some(
        (c) => c.parent_id === cat.id && recurringCatIds.has(c.id),
      );
    };
    const rootExp = roots
      .filter((c) => c.kind === "expense" && !hiddenIds.has(c.id))
      .sort((a, b) => {
        const pa = isPinned(a) ? 1 : 0;
        const pb = isPinned(b) ? 1 : 0;
        if (pa !== pb) return pb - pa;
        return a.sort_order - b.sort_order;
      });
    const sav = roots.filter((c) => c.kind === "savings" && !hiddenIds.has(c.id));
    const inc = roots.filter((c) => c.kind === "income" && !hiddenIds.has(c.id));

    let totalExp = 0;
    let totalSav = 0;
    let totalInc = 0;
    for (const e of entries) {
      const cat = categories.find((c) => c.id === e.category_id);
      if (!cat) continue;
      const root =
        categories.find((c) => c.id === (cat.parent_id ?? cat.id)) ?? cat;
      if (root.kind === "savings") totalSav += e.amount;
      else if (root.kind === "income") totalInc += e.amount;
      else totalExp += e.amount;
    }
    return {
      rootExpenses: rootExp,
      savings: sav,
      incomes: inc,
      totalExpense: totalExp,
      totalSavings: totalSav,
      totalIncome: totalInc,
    };
  }, [categories, entries, recurring, hiddenIds]);

  const hiddenList = useMemo(
    () => categories.filter((c) => !c.parent_id && hiddenIds.has(c.id)),
    [categories, hiddenIds],
  );

  const rowProps = {
    recurring,
    profileNames: editorNames,
    onAddEntry: addEntry,
    onUpdateEntry: updateEntry,
    onTogglePaid: togglePaid,
    onDeleteEntry: deleteEntry,
    onDeleteCategory: deleteCategory,
    onSetRecurring: setRecurringForCategory,
    onRemoveRecurring: removeRecurringForCategory,
  };

  if (authLoading || !user) return null;

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
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/perfil">
              <Button variant="ghost" size="icon" className="rounded-xl" title="Perfil">
                <UserIcon className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl"
              title="Sair"
              onClick={async () => {
                await signOut();
                navigate({ to: "/auth" });
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
            <Link to="/visao-anual">
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
                <BarChart3 className="h-4 w-4" />
                Visão anual
              </Button>
            </Link>
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

        <SummaryCards
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          totalSavings={totalSavings}
        />

        <CategoryChart categories={categories} entries={entries} />

        {/* Incomes */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-income">
            Receitas
          </h2>
          {loading ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : (
            <div className="space-y-2.5">
              {incomes.map((cat) => (
                <CategoryRow
                  key={cat.id}
                  category={cat}
                  subcategories={categories.filter((c) => c.parent_id === cat.id)}
                  entries={entries}
                  allEntries={entries}
                  {...rowProps}
                />
              ))}
            </div>
          )}
        </section>

        {/* Expenses */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Gastos
            </h2>
            <AddCategoryDialog categories={categories} onAdd={addCategory} />
          </div>
          {hiddenList.length > 0 && (
            <div className="rounded-xl border border-dashed border-border bg-card/40 p-3">
              <div className="mb-2 text-xs text-muted-foreground">
                Excluídos neste mês — clique para restaurar:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {hiddenList.map((c) => (
                  <Button
                    key={c.id}
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-full text-xs"
                    onClick={() => restoreCategoryForMonth(c.id)}
                  >
                    + {c.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
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
                    {...rowProps}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* Savings */}
        <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-savings">
            Investimentos
          </h2>
          <div className="space-y-2.5">
            {savings.map((cat) => (
              <CategoryRow
                key={cat.id}
                category={cat}
                subcategories={categories.filter((c) => c.parent_id === cat.id)}
                entries={entries}
                allEntries={entries}
                {...rowProps}
              />
            ))}
          </div>
        </section>

        <DebtsSection />

        <footer className="pt-4 text-center text-xs text-muted-foreground">
          Dados sincronizados na nuvem ✨
        </footer>
      </div>
    </div>
  );
}
