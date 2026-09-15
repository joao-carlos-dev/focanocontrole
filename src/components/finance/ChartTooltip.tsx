import { formatBRL } from "@/lib/format";

interface PayloadItem {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string;
}

interface Props {
  active?: boolean;
  payload?: PayloadItem[];
  label?: string;
}

export function ChartTooltip({ active, payload, label }: Props) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card/95 p-3 shadow-[var(--shadow-elegant)] backdrop-blur-sm">
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</div>
      <div className="space-y-1">
        {payload.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: item.color || "var(--primary)" }}
            />
            <span className="flex-1">{item.name || item.dataKey}:</span>
            <span>{formatBRL(Number(item.value ?? 0))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
