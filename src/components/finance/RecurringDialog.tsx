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
import { Label } from "@/components/ui/label";
import type { Recurring } from "@/hooks/use-finance";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categoryName: string;
  categoryId: string;
  current: Recurring | undefined;
  onSave: (categoryId: string, amount: number, note?: string) => Promise<void>;
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

  useEffect(() => {
    if (open) {
      setAmount(current ? String(current.amount).replace(".", ",") : "");
      setNote(current?.note ?? "");
    }
  }, [open, current]);

  const save = async () => {
    const v = parseFloat(amount.replace(",", "."));
    if (isNaN(v) || v < 0) return;
    await onSave(categoryId, v, note);
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
            Valor fixo mensal
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
            <Input
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              inputMode="decimal"
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
          </div>
          <div className="space-y-2">
            <Label>Observação (opcional)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: vencimento dia 10"
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
