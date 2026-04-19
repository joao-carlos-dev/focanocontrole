import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MONTHS_PT } from "@/lib/format";

interface Props {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}

export function MonthSelector({ year, month, onChange }: Props) {
  const prev = () => {
    const m = month - 1;
    if (m < 1) onChange(year - 1, 12);
    else onChange(year, m);
  };
  const next = () => {
    const m = month + 1;
    if (m > 12) onChange(year + 1, 1);
    else onChange(year, m);
  };

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-border bg-card/60 p-1.5 backdrop-blur">
      <Button variant="ghost" size="icon" onClick={prev} className="h-9 w-9 rounded-xl">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="min-w-[140px] text-center">
        <div className="text-sm font-semibold tracking-tight">{MONTHS_PT[month - 1]}</div>
        <div className="text-xs text-muted-foreground">{year}</div>
      </div>
      <Button variant="ghost" size="icon" onClick={next} className="h-9 w-9 rounded-xl">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
