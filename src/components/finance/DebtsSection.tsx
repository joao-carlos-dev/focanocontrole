import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Landmark,
  HandCoins,
  ChevronRight,
} from "lucide-react";
import { formatBRL, MONTHS_PT } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebts } from "@/hooks/use-debts";

interface Props {
  year: number;
  month: number;
}

export function DebtsSection({ year, month }: Props) {
  const {
    debts,
    total,
    loading,
    addDebt,
    updateDebt,
    deleteDebt,
    payDebt,
    deletePayment,
    monthPayments,
    monthPaymentsTotal,
    balanceAt,
  } = useDebts(year, month);
  const [adding, setAdding] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payValue, setPayValue] = useState("");

  const parse = (v: string) => Number(v.replace(/\./g, "").replace(",", ".")) || 0;

  const submitNew = async () => {
    if (!newDesc.trim()) return;
    const id = await addDebt(newDesc.trim(), parse(newAmount));
    setNewDesc("");
    setNewAmount("");
    setAdding(false);
    if (id) setExpandedId(id);
  };

  const startEdit = (id: string, desc: string, amount: number) => {
    setEditingId(id);
    setExpandedId(id);
    setEditDesc(desc);
    setEditAmount(String(amount).replace(".", ","));
  };

  const submitEdit = async () => {
    if (!editingId) return;
    await updateDebt(editingId, editDesc.trim() || "Dívida", parse(editAmount));
    setEditingId(null);
  };

  const submitPay = async () => {
    if (!payingId) return;
    const value = parse(payValue);
    if (value <= 0) return;
    await payDebt(payingId, value);
    setPayValue("");
    setPayingId(null);
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-warning">
          Dívidas
        </h2>
        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer gap-1.5 rounded-xl"
          onClick={() => setAdding((v) => !v)}
        >
          <Plus className="h-4 w-4" />
          Nova dívida
        </Button>
      </div>

      <div className="space-y-2.5 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-elegant)]">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-warning/10 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-warning" />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Total das dívidas
              </span>
            </div>
            <span className="text-lg font-bold tracking-tight">{formatBRL(total)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-destructive/10 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <HandCoins className="h-4 w-4 text-destructive" />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Pago em {MONTHS_PT[month - 1]}
              </span>
            </div>
            <span className="text-lg font-bold tracking-tight">
              {formatBRL(monthPaymentsTotal)}
            </span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          O saldo das dívidas não desconta o saldo do mês. Só os pagamentos que
          você registrar aqui são descontados — e apenas no mês em que foram
          feitos.
        </p>

        {adding && (
          <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-3 sm:flex-row">
            <Input
              autoFocus
              placeholder="Descrição (ex.: Cartão de crédito)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="rounded-xl"
            />
            <Input
              placeholder="0,00"
              inputMode="decimal"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              className="rounded-xl sm:w-36"
              onKeyDown={(e) => {
                if (e.key === "Enter") submitNew();
              }}
            />
            <div className="flex gap-2">
              <Button
                size="icon"
                className="cursor-pointer rounded-xl"
                onClick={submitNew}
                title="Salvar"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="cursor-pointer rounded-xl"
                onClick={() => setAdding(false)}
                title="Cancelar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Carregando...
          </div>
        ) : debts.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma dívida cadastrada.
          </div>
        ) : (
          <div className="space-y-2">
            {debts.map((d) => {
              const paidThisMonth = monthPayments.filter((p) => p.debt_id === d.id);
              const open = expandedId === d.id;
              const toggle = () => setExpandedId(open ? null : d.id);
              return (
                <div
                  key={d.id}
                  className="overflow-hidden rounded-xl border border-border/60 bg-background/40"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={open}
                    aria-label={`${d.description} — ${open ? "recolher" : "expandir"} detalhes`}
                    onClick={toggle}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggle();
                      }
                    }}
                    className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
                  >
                    <span
                      aria-hidden="true"
                      title={open ? "Recolher" : "Expandir detalhes"}
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/70 text-muted-foreground transition-transform duration-200 ${
                        open ? "rotate-90" : ""
                      }`}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 break-words text-sm font-medium">
                      {d.description}
                    </span>
                    {paidThisMonth.length > 0 && (
                      <span className="hidden shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive sm:inline-flex">
                        {paidThisMonth.length === 1
                          ? "1 pagamento"
                          : `${paidThisMonth.length} pagamentos`}
                      </span>
                    )}
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatBRL(balanceAt(d.id, year, month))}
                    </span>
                  </div>

                  {open && (
                    <div className="space-y-2.5 border-t border-border/50 px-3 py-3">
                      {editingId === d.id ? (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <Input
                            autoFocus
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            className="rounded-xl"
                            placeholder="Descrição"
                          />
                          <Input
                            value={editAmount}
                            inputMode="decimal"
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="rounded-xl sm:w-32"
                            placeholder="0,00"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") submitEdit();
                            }}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="icon"
                              className="cursor-pointer rounded-xl"
                              onClick={submitEdit}
                              title="Salvar"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="cursor-pointer rounded-xl"
                              onClick={() => setEditingId(null)}
                              title="Cancelar"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="cursor-pointer gap-1.5 rounded-xl"
                            title="Registrar pagamento"
                            onClick={() => {
                              setPayingId(payingId === d.id ? null : d.id);
                              setPayValue("");
                            }}
                          >
                            <HandCoins className="h-4 w-4" />
                            Pagar
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="cursor-pointer rounded-xl"
                            title="Editar valor"
                            onClick={() => startEdit(d.id, d.description, d.amount)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="cursor-pointer rounded-xl text-destructive"
                            title="Excluir dívida"
                            onClick={() => deleteDebt(d.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      {payingId === d.id && (
                        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-3 sm:flex-row sm:items-center">
                          <span className="text-xs text-muted-foreground">
                            Valor pago em {MONTHS_PT[month - 1]}:
                          </span>
                          <Input
                            autoFocus
                            placeholder="0,00"
                            inputMode="decimal"
                            value={payValue}
                            onChange={(e) => setPayValue(e.target.value)}
                            className="rounded-xl sm:w-36"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") submitPay();
                            }}
                          />
                          <Button
                            size="sm"
                            className="cursor-pointer rounded-xl"
                            onClick={submitPay}
                          >
                            Descontar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="cursor-pointer rounded-xl"
                            onClick={() => setPayingId(null)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      )}

                      {paidThisMonth.length > 0 && (
                        <div className="space-y-1 pl-1">
                          {paidThisMonth.map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center gap-2 text-xs text-muted-foreground"
                            >
                              <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive">
                                − {formatBRL(p.amount)}
                              </span>
                              <span>
                                {new Date(
                                  p.payment_date + "T00:00:00",
                                ).toLocaleDateString("pt-BR")}
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 cursor-pointer rounded-lg"
                                title="Desfazer pagamento"
                                onClick={() => deletePayment(p.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
