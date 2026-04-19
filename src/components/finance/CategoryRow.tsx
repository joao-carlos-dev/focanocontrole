import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Pin,
  PinOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBRL } from "@/lib/format";
import type { Category, Entry, Recurring } from "@/hooks/use-finance";
import { RecurringDialog } from "./RecurringDialog";

interface Props {
  category: Category;
  subcategories: Category[];
  entries: Entry[];
  allEntries: Entry[];
  recurring: Recurring[];
  onAddEntry: (categoryId: string, amount: number, note?: string) => Promise<void>;
  onUpdateEntry: (id: string, amount: number, note?: string) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onSetRecurring: (categoryId: string, amount: number, note?: string) => Promise<void>;
  onRemoveRecurring: (categoryId: string) => Promise<void>;
}

export function CategoryRow({
  category,
  subcategories,
  entries,
  allEntries,
  recurring,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  onDeleteCategory,
  onSetRecurring,
  onRemoveRecurring,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editNote, setEditNote] = useState("");
  const [recurringFor, setRecurringFor] = useState<Category | null>(null);

  const directEntries = entries.filter((e) => e.category_id === category.id);
  const subEntries = subcategories.flatMap((s) =>
    allEntries.filter((e) => e.category_id === s.id),
  );
  const total =
    directEntries.reduce((s, e) => s + e.amount, 0) +
    subEntries.reduce((s, e) => s + e.amount, 0);

  const isSavings = category.kind === "savings";
  const isIncome = category.kind === "income";
  const accentColor = isIncome
    ? "text-income"
    : isSavings
      ? "text-savings"
      : "text-foreground";
  const dotColor = isIncome ? "bg-income" : isSavings ? "bg-savings" : "bg-primary";

  const recurringForCat = (catId: string) =>
    recurring.find((r) => r.category_id === catId);
  const isPinned = !!recurringForCat(category.id);

  const handleAdd = async (catId: string) => {
    const v = parseFloat(amount.replace(",", "."));
    if (isNaN(v) || v <= 0) return;
    await onAddEntry(catId, v, note);
    setAmount("");
    setNote("");
    setAdding(null);
  };

  const startEdit = (e: Entry) => {
    setEditingId(e.id);
    setEditAmount(String(e.amount));
    setEditNote(e.note || "");
  };

  const saveEdit = async (id: string) => {
    const v = parseFloat(editAmount.replace(",", "."));
    if (isNaN(v) || v < 0) return;
    await onUpdateEntry(id, v, editNote);
    setEditingId(null);
  };

  const renderEntries = (catId: string, list: Entry[]) => (
    <div className="space-y-1.5">
      {list.map((e) => (
        <div
          key={e.id}
          className="flex items-center gap-2 rounded-lg bg-background/40 px-3 py-2 text-sm"
        >
          {editingId === e.id ? (
            <>
              <Input
                value={editAmount}
                onChange={(ev) => setEditAmount(ev.target.value)}
                className="h-8 w-24"
                inputMode="decimal"
              />
              <Input
                value={editNote}
                onChange={(ev) => setEditNote(ev.target.value)}
                placeholder="Nota"
                className="h-8 flex-1"
              />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveEdit(e.id)}>
                <Check className="h-4 w-4 text-primary" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setEditingId(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <span className="font-medium">{formatBRL(e.amount)}</span>
              {e.note && (
                <span className="truncate text-xs text-muted-foreground">— {e.note}</span>
              )}
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(e.entry_date).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                })}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => startEdit(e)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => onDeleteEntry(e.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      ))}
      {adding === catId ? (
        <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-background/60 px-2 py-1.5">
          <Input
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            inputMode="decimal"
            className="h-8 w-24"
            onKeyDown={(e) => e.key === "Enter" && handleAdd(catId)}
          />
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nota (opcional)"
            className="h-8 flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleAdd(catId)}
          />
          <Button size="sm" className="h-8" onClick={() => handleAdd(catId)}>
            Salvar
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => {
              setAdding(null);
              setAmount("");
              setNote("");
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-full justify-start gap-1.5 text-muted-foreground hover:text-foreground"
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
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-elegant)]">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
        >
          <div className={`h-2 w-2 rounded-full ${dotColor}`} />
          {subcategories.length > 0 ? (
            expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <div className="w-4" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-semibold tracking-tight">
                {category.name}
              </span>
              {isPinned && (
                <span
                  title="Conta fixa mensal"
                  className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-primary"
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
          <div className={`text-base font-bold tabular-nums ${accentColor}`}>
            {formatBRL(total)}
          </div>
          {subcategories.length === 0 && (
            <Button
              size="icon"
              variant="ghost"
              className={`h-7 w-7 ${isPinned ? "text-primary" : "text-muted-foreground"} hover:text-primary`}
              onClick={(e) => {
                e.stopPropagation();
                setRecurringFor(category);
              }}
              title={isPinned ? "Editar valor fixo" : "Fixar todo mês"}
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
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Excluir categoria "${category.name}" e todos os lançamentos?`)) {
                onDeleteCategory(category.id);
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </button>

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
                    <div
                      key={sub.id}
                      className="rounded-xl border border-border/60 bg-card/60 p-3"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                        <span className="text-sm font-medium">{sub.name}</span>
                        {subPinned && (
                          <Pin className="h-3 w-3 fill-current text-primary" />
                        )}
                        <span className="ml-auto text-sm font-semibold tabular-nums">
                          {formatBRL(subTotal)}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className={`h-6 w-6 ${subPinned ? "text-primary" : "text-muted-foreground"} hover:text-primary`}
                          onClick={() => setRecurringFor(sub)}
                          title={subPinned ? "Editar valor fixo" : "Fixar todo mês"}
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
                            if (confirm(`Excluir subcategoria "${sub.name}"?`)) {
                              onDeleteCategory(sub.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
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
