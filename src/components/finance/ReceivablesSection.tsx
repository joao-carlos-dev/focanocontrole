import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Wallet,
  HandCoins,
} from "lucide-react";
import { formatBRL, MONTHS_PT } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useReceivables } from "@/hooks/use-receivables";

interface Props {
  year: number;
  month: number;
}

export function ReceivablesSection({ year, month }: Props) {
  const {
    receivables,
    total,
    loading,
    addReceivable,
    updateReceivable,
    deleteReceivable,
    receivePayment,
    deletePayment,
    monthPayments,
    monthPaymentsTotal,
    balanceAt,
  } = useReceivables(year, month);
  const [adding, setAdding] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const [receiveValue, setReceiveValue] = useState("");

  const parse = (v: string) => Number(v.replace(/\./g, "").replace(",", ".")) || 0;

  const submitNew = async () => {
    if (!newDesc.trim()) return;
    await addReceivable(newDesc.trim(), parse(newAmount));
    setNewDesc("");
    setNewAmount("");
    setAdding(false);
  };

  const startEdit = (id: string, desc: string, amount: number) => {
    setEditingId(id);
    setEditDesc(desc);
    setEditAmount(String(amount).replace(".", ","));
  };

  const submitEdit = async () => {
    if (!editingId) return;
    await updateReceivable(editingId, editDesc.trim() || "A receber", parse(editAmount));
    setEditingId(null);
  };

  const submitReceive = async () => {
    if (!receivingId) return;
    const value = parse(receiveValue);
    if (value <= 0) return;
    await receivePayment(receivingId, value);
    setReceiveValue("");
    setReceivingId(null);
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-income">
          Dinheiro a receber
        </h2>
        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer gap-1.5 rounded-xl"
          onClick={() => setAdding((v) => !v)}
        >
          <Plus className="h-4 w-4" />
          Novo valor a receber
        </Button>
      </div>

      <div className="space-y-2.5 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-elegant)]">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-income/10 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-income" />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Total a receber
              </span>
            </div>
            <span className="text-lg font-bold tracking-tight">{formatBRL(total)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-income/10 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <HandCoins className="h-4 w-4 text-income" />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Recebido em {MONTHS_PT[month - 1]}
              </span>
            </div>
            <span className="text-lg font-bold tracking-tight">
              {formatBRL(monthPaymentsTotal)}
            </span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          O saldo a receber não altera o saldo do mês. Só os valores que você
          registrar como recebidos entram no saldo — e apenas no mês em que
          foram recebidos.
        </p>

        {adding && (
          <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-3 sm:flex-row">
            <Input
              autoFocus
              placeholder="Descrição (ex.: Empréstimo para o João)"
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
        ) : receivables.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Nenhum valor a receber cadastrado.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {receivables.map((d) => {
              const receivedThisMonth = monthPayments.filter(
                (p) => p.receivable_id === d.id,
              );
              return (
                <div key={d.id} className="space-y-2 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {editingId === d.id ? (
                      <>
                        <Input
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          className="rounded-xl"
                        />
                        <Input
                          value={editAmount}
                          inputMode="decimal"
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="w-28 rounded-xl"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") submitEdit();
                          }}
                        />
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
                      </>
                    ) : (
                      <>
                        <span className="min-w-0 flex-1 break-words text-sm font-medium">
                          {d.description}
                        </span>
                        <span className="text-sm font-semibold tabular-nums">
                          {formatBRL(balanceAt(d.id, year, month))}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="cursor-pointer gap-1.5 rounded-xl"
                          title="Registrar recebimento"
                          onClick={() => {
                            setReceivingId(receivingId === d.id ? null : d.id);
                            setReceiveValue("");
                          }}
                        >
                          <HandCoins className="h-4 w-4" />
                          Receber
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
                          title="Excluir"
                          onClick={() => deleteReceivable(d.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>

                  {receivingId === d.id && (
                    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-3 sm:flex-row sm:items-center">
                      <span className="text-xs text-muted-foreground">
                        Valor recebido em {MONTHS_PT[month - 1]}:
                      </span>
                      <Input
                        autoFocus
                        placeholder="0,00"
                        inputMode="decimal"
                        value={receiveValue}
                        onChange={(e) => setReceiveValue(e.target.value)}
                        className="rounded-xl sm:w-36"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") submitReceive();
                        }}
                      />
                      <Button
                        size="sm"
                        className="cursor-pointer rounded-xl"
                        onClick={submitReceive}
                      >
                        Confirmar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="cursor-pointer rounded-xl"
                        onClick={() => setReceivingId(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  )}

                  {receivedThisMonth.length > 0 && (
                    <div className="space-y-1 pl-1">
                      {receivedThisMonth.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-2 text-xs text-muted-foreground"
                        >
                          <span className="rounded-full bg-income/10 px-2 py-0.5 font-medium text-income">
                            + {formatBRL(p.amount)}
                          </span>
                          <span>
                            {new Date(p.payment_date + "T00:00:00").toLocaleDateString(
                              "pt-BR",
                            )}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 cursor-pointer rounded-lg"
                            title="Desfazer recebimento"
                            onClick={() => deletePayment(p.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
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
