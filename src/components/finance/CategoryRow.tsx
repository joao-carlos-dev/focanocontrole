import { useState } from "react";
import {
  ChevronRight,

  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Pin,
  PinOff,
  Calendar as CalendarIcon,
  CircleCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Label } from "@/components/ui/label";
import { formatBRL } from "@/lib/format";
import type { Category, Entry, Recurring } from "@/hooks/use-finance";
import { RecurringDialog } from "./RecurringDialog";
import { CategoryStylePicker } from "./CategoryStylePicker";

interface Props {
  category: Category;
  subcategories: Category[];
  entries: Entry[];
  allEntries: Entry[];
  recurring: Recurring[];
  onAddEntry: (
    categoryId: string,
    amount: number,
    note?: string,
    due_date?: string | null,
  ) => Promise<void>;
  onUpdateEntry: (
    id: string,
    amount: number,
    note?: string,
    due_date?: string | null,
  ) => Promise<void>;
  onTogglePaid: (id: string, paid: boolean) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onSetRecurring: (
    categoryId: string,
    amount: number,
    note?: string,
    due_day?: number | null,
  ) => Promise<void>;
  onRemoveRecurring: (categoryId: string) => Promise<void>;
  profileNames?: Record<string, string>;
}

export function CategoryRow({
  category,
  subcategories,
  entries,
  allEntries,
  recurring,
  onAddEntry,
  onUpdateEntry,
  onTogglePaid,
  onDeleteEntry,
  onDeleteCategory,
  onSetRecurring,
  onRemoveRecurring,
  profileNames = {},
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState("");
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [recurringFor, setRecurringFor] = useState<Category | null>(null);

  const directEntries = entries.filter((e) => e.category_id === category.id);
  const subEntries = subcategories.flatMap((s) => allEntries.filter((e) => e.category_id === s.id));
  const total =
    directEntries.reduce((s, e) => s + e.amount, 0) + subEntries.reduce((s, e) => s + e.amount, 0);

  const isSavings = category.kind === "savings";
  const isIncome = category.kind === "income";
  const isExpense = !isSavings && !isIncome;
  const accentColor = isIncome ? "text-income" : isSavings ? "text-savings" : "text-foreground";
  const dotColor = isIncome ? "bg-income" : isSavings ? "bg-savings" : "bg-primary";

  const recurringForCat = (catId: string) => recurring.find((r) => r.category_id === catId);
  const isPinned = !!recurringForCat(category.id);

  const getEntryStatus = (e: Entry): "paid" | "overdue" | "upcoming" | null => {
    if (e.paid) return "paid";
    if (!e.due_date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(e.due_date + "T00:00:00");
    return due.getTime() < today.getTime() ? "overdue" : "upcoming";
  };

  const expenseEntries = [...directEntries, ...subEntries];
  const categoryStatus = isExpense
    ? expenseEntries.some((e) => getEntryStatus(e) === "overdue")
      ? "overdue"
      : expenseEntries.length > 0 && expenseEntries.every((e) => getEntryStatus(e) === "paid")
        ? "paid"
        : expenseEntries.some((e) => getEntryStatus(e) === "upcoming")
          ? "upcoming"
          : null
    : null;

  const statusCardClass =
    categoryStatus === "paid"
      ? "border-primary/50"
      : categoryStatus === "overdue"
        ? "border-destructive/60"
        : categoryStatus === "upcoming"
          ? "border-warning/60"
          : "border-border";
  const statusHeaderClass =
    categoryStatus === "paid"
      ? "bg-primary/10"
      : categoryStatus === "overdue"
        ? "bg-destructive/10"
        : categoryStatus === "upcoming"
          ? "bg-warning/10"
          : "";

  const formatDueShort = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });

  const headerDueInfo: { text: string; cls: string } | null = (() => {
    if (!isExpense) return null;
    const withDue = expenseEntries.filter((e) => e.due_date);
    if (withDue.length === 0) return null;
    const overdue = withDue
      .filter((e) => !e.paid && getEntryStatus(e) === "overdue")
      .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
    if (overdue.length > 0) {
      const firstDueDate = overdue[0]?.due_date;
      if (!firstDueDate) return null;
      return {
        text: `Vencida ${formatDueShort(firstDueDate)}`,
        cls: "border-destructive/50 bg-destructive/15 text-destructive",
      };
    }
    const upcoming = withDue
      .filter((e) => !e.paid && getEntryStatus(e) === "upcoming")
      .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
    if (upcoming.length > 0) {
      const firstDueDate = upcoming[0]?.due_date;
      if (!firstDueDate) return null;
      return {
        text: `Vence ${formatDueShort(firstDueDate)}`,
        cls: "border-warning/50 bg-warning/15 text-warning",
      };
    }
    const allPaid = withDue.every((e) => e.paid);
    if (allPaid) {
      return {
        text: "Pago",
        cls: "border-primary/50 bg-primary/15 text-primary",
      };
    }
    return null;
  })();

  const handleAdd = async (catId: string) => {
    const v = parseFloat(amount);
    if (isNaN(v) || v <= 0) return;
    await onAddEntry(catId, v, note, dueDate || null);
    setAmount("");
    setNote("");
    setDueDate("");
    setAdding(null);
  };

  const toggleRecurring = async (cat: Category, checked: boolean) => {
    if (checked) {
      // Use the current month's entry value (if any) to seed the recurring template.
      const current = allEntries.find((e) => e.category_id === cat.id);
      if (current && current.amount > 0) {
        let dueDay: number | null = null;
        if (current.due_date) {
          const d = new Date(current.due_date + "T00:00:00").getDate();
          if (d >= 1 && d <= 28) dueDay = d;
        }
        await onSetRecurring(cat.id, current.amount, current.note ?? undefined, dueDay);
      } else {
        // No value yet — open the dialog so the user can set one.
        setRecurringFor(cat);
      }
    } else {
      await onRemoveRecurring(cat.id);
    }
  };

  const startEdit = (e: Entry) => {
    setEditingId(e.id);
    setEditAmount(String(e.amount));
    setEditNote(e.note || "");
    setEditDueDate(e.due_date || "");
  };

  const saveEdit = async (id: string) => {
    const v = parseFloat(editAmount);
    if (isNaN(v) || v < 0) return;
    await onUpdateEntry(id, v, editNote, editDueDate || null);
    setEditingId(null);
  };

  const dueLabel = (
    e: Entry,
  ): { text: string; cls: string; rowCls: string; status: string } | null => {
    if (!e.due_date)
      return e.paid
        ? {
            text: "Pago",
            cls: "text-primary",
            rowCls: "border-primary/40 bg-primary/10",
            status: "Pago",
          }
        : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(e.due_date + "T00:00:00");
    const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
    const txt = `Vence ${due.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`;
    if (e.paid)
      return {
        text: `${txt} • pago`,
        cls: "text-primary",
        rowCls: "border-primary/40 bg-primary/10",
        status: "Pago",
      };
    if (diffDays < 0)
      return {
        text: `${txt} • atrasada`,
        cls: "text-destructive",
        rowCls: "border-destructive/50 bg-destructive/10",
        status: "Vencida",
      };
    if (diffDays === 0)
      return {
        text: `${txt} • hoje`,
        cls: "text-destructive",
        rowCls: "border-destructive/50 bg-destructive/10",
        status: "Vence hoje",
      };
    return {
      text: diffDays <= 2 ? `${txt} • em ${diffDays}d` : txt,
      cls: "text-warning",
      rowCls: "border-warning/50 bg-warning/10",
      status: "À vencer",
    };
  };

  const personLabel = (userId?: string | null) => {
    if (!userId) return null;
    return profileNames[userId] ?? "Usuário";
  };

  const renderEntries = (catId: string, list: Entry[]) => (
    <div className="space-y-1.5">
      {list.map((e) => {
        const due = dueLabel(e);
        return (
          <div
            key={e.id}
            className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border px-3 py-2 text-sm sm:flex sm:flex-wrap ${due?.rowCls ?? "border-transparent bg-background/40"} ${e.paid ? "opacity-80" : ""}`}
          >
            {editingId === e.id ? (
              <>
                <div className="min-w-0 space-y-1 sm:w-24 sm:shrink-0">
                  <Label className="text-[11px] text-muted-foreground sm:sr-only">Valor</Label>
                  <MoneyInput
                    value={editAmount}
                    onValueChange={setEditAmount}
                    className="h-9 w-full sm:h-8"
                    inputMode="decimal"
                  />
                </div>
                <div className="min-w-0 space-y-1 sm:flex-1">
                  <Label className="text-[11px] text-muted-foreground sm:sr-only">Nota</Label>
                  <Input
                    value={editNote}
                    onChange={(ev) => setEditNote(ev.target.value)}
                    placeholder="Nota (opcional)"
                    className="h-9 w-full sm:h-8"
                  />
                </div>
                {isExpense && (
                  <div className="col-span-2 min-w-0 space-y-1 sm:w-[150px] sm:shrink-0">
                    <Label className="text-[11px] text-muted-foreground sm:sr-only">
                      Data de vencimento
                    </Label>
                    <Input
                      type="date"
                      value={editDueDate}
                      onChange={(ev) => setEditDueDate(ev.target.value)}
                      className="h-9 w-full sm:h-8"
                      aria-label="Data de vencimento"
                    />
                  </div>
                )}
                <div className="col-span-2 flex justify-end gap-1 sm:contents">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => saveEdit(e.id)}
                    title="Salvar alterações"
                  >
                    <Check className="h-4 w-4 text-primary" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => setEditingId(null)}
                    title="Cancelar edição"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  {isExpense && (
                    <Button
                      type="button"
                      size="sm"
                      variant={e.paid ? "secondary" : "outline"}
                      className="h-7 shrink-0 gap-1 px-2 text-xs"
                      onClick={() => onTogglePaid(e.id, !e.paid)}
                      title={e.paid ? "Marcar como não paga" : "Marcar como paga"}
                    >
                      {e.paid ? <CircleCheck className="h-3.5 w-3.5" /> : null}
                      {e.paid ? "Pago" : "Paguei"}
                    </Button>
                  )}
                  <span className={`shrink-0 font-medium ${e.paid ? "line-through" : ""}`}>
                    {formatBRL(e.amount)}
                  </span>
                  {e.note && (
                    <span className="min-w-0 text-xs text-muted-foreground sm:truncate">— {e.note}</span>
                  )}
                </div>
                <div className="flex shrink-0 items-center justify-end gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => startEdit(e)}
                    title="Editar lançamento"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => onDeleteEntry(e.id)}
                    title="Excluir lançamento"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {due && (
                  <span
                    className={`col-span-2 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${due.cls}`}
                  >
                    <CalendarIcon className="h-3 w-3" />
                    {due.text}
                  </span>
                )}
                {personLabel(e.updated_by || e.created_by) && (
                  <span className="col-span-2 text-[11px] text-muted-foreground">
                    Editado por {personLabel(e.updated_by || e.created_by)}
                  </span>
                )}
              </>
            )}
          </div>
        );
      })}
      {adding === catId ? (
        <div className="grid grid-cols-2 items-end gap-2 rounded-lg border border-primary/40 bg-background/60 p-2 sm:flex sm:flex-wrap sm:items-center">
          <div className="min-w-0 space-y-1 sm:w-24 sm:shrink-0">
            <Label className="text-[11px] text-muted-foreground sm:sr-only">Valor</Label>
            <MoneyInput
              autoFocus
              value={amount}
              onValueChange={setAmount}
              placeholder="0,00"
              inputMode="decimal"
              className="h-9 w-full sm:h-8"
              onKeyDown={(e) => e.key === "Enter" && handleAdd(catId)}
            />
          </div>
          <div className="min-w-0 space-y-1 sm:flex-1">
            <Label className="text-[11px] text-muted-foreground sm:sr-only">Nota</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nota (opcional)"
              className="h-9 w-full sm:h-8"
              onKeyDown={(e) => e.key === "Enter" && handleAdd(catId)}
            />
          </div>
          {isExpense && (
            <div className="col-span-2 min-w-0 space-y-1 sm:w-[150px] sm:shrink-0">
              <Label className="text-[11px] text-muted-foreground sm:sr-only">
                Data de vencimento
              </Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9 w-full sm:h-8"
                aria-label="Data de vencimento"
              />
            </div>
          )}
          <div className="col-span-2 flex justify-end gap-2 sm:contents">
            <Button size="sm" className="h-9 sm:h-8" onClick={() => handleAdd(catId)}>
              Salvar
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 sm:h-8 sm:w-8"
              title="Cancelar"
              onClick={() => {
                setAdding(null);
                setAmount("");
                setNote("");
                setDueDate("");
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

      ) : (
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-full cursor-pointer justify-start gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => setAdding(catId)}
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar lançamento
        </Button>
      )}
    </div>
  );

  return (
    <>
      <div
        className={`group/category overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-elegant)] ${statusCardClass}`}
      >

        <div
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          aria-label={`${category.name} — ${expanded ? "recolher" : "expandir"} lançamentos`}
          onClick={() => setExpanded((v) => !v)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setExpanded((value) => !value);
            }
          }}
          className={`grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 px-3 py-3 text-left transition-colors hover:bg-muted/40 sm:flex sm:items-center sm:gap-3 sm:px-4 ${statusHeaderClass}`}
        >
          <div className="flex min-w-0 items-center gap-2 sm:contents">
            <div className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
            <CategoryStylePicker category={category} />
            <span
              aria-hidden="true"
              title={expanded ? "Recolher" : "Expandir lançamentos"}
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/70 text-muted-foreground transition-transform duration-200 group-hover/category:border-primary/50 group-hover/category:text-foreground ${
                expanded ? "rotate-90" : ""
              }`}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </div>

          <div className="min-w-0 self-center sm:flex-1">
            <div className="flex items-center gap-1.5">
              <span className="min-w-0 break-words font-semibold tracking-tight sm:truncate">{category.name}</span>
              {isPinned && (
                <span
                  title="Conta fixa mensal"
                  className="hidden shrink-0 items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-primary sm:inline-flex"
                >
                  <Pin className="h-2.5 w-2.5" /> fixo
                </span>
              )}
            </div>
            {isSavings && (
              <div className="text-[10px] uppercase tracking-wider text-savings">Poupar</div>
            )}
            {isIncome && (
              <div className="text-[10px] uppercase tracking-wider text-income">Receita</div>
            )}
          </div>
          <div className="col-span-2 flex min-w-0 items-center gap-2 border-t border-border/50 pt-2 sm:contents sm:border-0 sm:pt-0">
            {headerDueInfo && (
              <span
                className={`inline-flex min-w-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${headerDueInfo.cls}`}
              >
                <CalendarIcon className="h-3 w-3 shrink-0" />
                <span className="truncate">{headerDueInfo.text}</span>
              </span>
            )}
            <div className={`ml-auto shrink-0 text-sm font-bold tabular-nums sm:text-base ${accentColor}`}>
              {formatBRL(total)}
            </div>
            {subcategories.length === 0 && isExpense && (
              <label
                className="flex shrink-0 cursor-pointer items-center gap-1 text-[11px] text-muted-foreground select-none"
                onClick={(e) => e.stopPropagation()}
                title="Recorrente — repetir nos próximos meses"
              >
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => toggleRecurring(category, e.target.checked)}
                  className="h-4 w-4 cursor-pointer accent-primary"
                  aria-label="Conta recorrente"
                />
                <span className="hidden sm:inline">Recorrente</span>
              </label>
            )}
            {subcategories.length === 0 && (
              <Button
                size="icon"
                variant="ghost"
                className={`h-8 w-8 shrink-0 sm:h-7 sm:w-7 ${isPinned ? "text-primary" : "text-muted-foreground"} hover:text-primary`}
                onClick={(e) => {
                  e.stopPropagation();
                  setRecurringFor(category);
                }}
                title={isPinned ? "Editar conta fixa" : "Marcar como conta fixa"}
              >
                {isPinned ? (
                  <Pin className="h-3.5 w-3.5 fill-current" />
                ) : (
                  <PinOff className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive sm:h-7 sm:w-7"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Excluir os lançamentos de "${category.name}" apenas deste mês?`)) {
                  onDeleteCategory(category.id);
                }
              }}
              title="Excluir lançamentos deste mês"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="border-t border-border bg-background/30 p-3">
            {subcategories.length === 0 ? (
              renderEntries(category.id, directEntries)
            ) : (
              <div className="space-y-3">
                {directEntries.length > 0 && renderEntries(category.id, directEntries)}
                {subcategories.map((sub) => {
                  const subList = allEntries.filter((e) => e.category_id === sub.id);
                  const subTotal = subList.reduce((s, e) => s + e.amount, 0);
                  const subPinned = !!recurringForCat(sub.id);
                  return (
                    <div key={sub.id} className="rounded-xl border border-border/60 bg-card/60 p-3">
                      <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex">
                        <div className="flex min-w-0 items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                        <span className="min-w-0 break-words text-sm font-medium">{sub.name}</span>
                        {subPinned && <Pin className="h-3 w-3 fill-current text-primary" />}
                        </div>
                        <span className="text-sm font-semibold tabular-nums sm:ml-auto">
                          {formatBRL(subTotal)}
                        </span>
                        <div className="col-span-2 flex items-center justify-end gap-1 border-t border-border/50 pt-2 sm:contents sm:border-0 sm:pt-0">
                        {sub.kind === "expense" && (
                          <label
                            className="flex shrink-0 cursor-pointer items-center gap-1 text-[11px] text-muted-foreground select-none"
                            title="Recorrente — repetir nos próximos meses"
                          >
                            <input
                              type="checkbox"
                              checked={subPinned}
                              onChange={(e) => toggleRecurring(sub, e.target.checked)}
                              className="h-3.5 w-3.5 cursor-pointer accent-primary"
                            />
                            <span className="hidden sm:inline">Recorrente</span>
                          </label>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className={`h-6 w-6 cursor-pointer ${subPinned ? "text-primary" : "text-muted-foreground"} hover:text-primary`}
                          onClick={() => setRecurringFor(sub)}
                          title={subPinned ? "Editar conta fixa" : "Marcar como conta fixa"}
                        >
                          {subPinned ? (
                            <Pin className="h-3 w-3 fill-current" />
                          ) : (
                            <PinOff className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Excluir os lançamentos de "${sub.name}" apenas deste mês?`)) {
                              onDeleteCategory(sub.id);
                            }
                          }}
                          title="Excluir lançamentos deste mês"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        </div>
                      </div>
                      {renderEntries(sub.id, subList)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {recurringFor && (
        <RecurringDialog
          open={!!recurringFor}
          onOpenChange={(v) => !v && setRecurringFor(null)}
          categoryName={recurringFor.name}
          categoryId={recurringFor.id}
          current={recurringForCat(recurringFor.id)}
          onSave={onSetRecurring}
          onRemove={onRemoveRecurring}
        />
      )}
    </>
  );
}
