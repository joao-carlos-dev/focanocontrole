import { useState, useEffect } from "react";
import { Pin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Label } from "@/components/ui/label";
import type { Recurring } from "@/hooks/use-finance";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categoryName: string;
  categoryId: string;
  current: Recurring | undefined;
  onSave: (
    categoryId: string,
    amount: number,
    note?: string,
    due_day?: number | null,
  ) => Promise<void>;
  onRemove: (categoryId: string) => Promise<void>;
}

export function RecurringDialog({
  open,
  onOpenChange,
  categoryName,
  categoryId,
  current,
  onSave,
  onRemove,
}: Props) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [dueDay, setDueDay] = useState("");

  useEffect(() => {
    if (open) {
      setAmount(current ? String(current.amount) : "");
      setNote(current?.note ?? "");
      setDueDay(current?.due_day ? String(current.due_day) : "");
    }
  }, [open, current]);

  const save = async () => {
    const v = parseFloat(amount);
    if (isNaN(v) || v < 0) return;
    let day: number | null = null;
    if (dueDay.trim()) {
      const n = parseInt(dueDay, 10);
      if (!isNaN(n) && n >= 1 && n <= 28) day = n;
    }
    await onSave(categoryId, v, note, day);
    onOpenChange(false);
  };

  const remove = async () => {
    await onRemove(categoryId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pin className="h-4 w-4 text-primary" />
            Conta fixa mensal
          </DialogTitle>
          <DialogDescription>
            Defina um valor padrão de <strong>{categoryName}</strong> que será
            lançado automaticamente todo mês. Você pode editar o lançamento de
            cada mês normalmente sem perder a recorrência.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Valor mensal (R$)</Label>
            <MoneyInput
              autoFocus
              value={amount}
              onValueChange={setAmount}
              placeholder="0,00"
              inputMode="decimal"
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
          </div>
          <div className="space-y-2">
            <Label>Dia do vencimento (1-28)</Label>
            <Input
              type="number"
              min={1}
              max={28}
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              placeholder="Ex: 10"
            />
            <p className="text-[11px] text-muted-foreground">
              Lembretes serão enviados 2 dias antes, 1 dia antes e no dia do
              vencimento, ao meio-dia.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Observação (opcional)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: cartão Itaú"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {current ? (
            <Button variant="ghost" className="text-destructive" onClick={remove}>
              Remover recorrência
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={save}>Salvar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
