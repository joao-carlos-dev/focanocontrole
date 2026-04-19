import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { Category, Entry } from "@/hooks/use-finance";
import { formatBRL } from "@/lib/format";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
];

interface Props {
  categories: Category[];
  entries: Entry[];
}

export function CategoryChart({ categories, entries }: Props) {
  const data = useMemo(() => {
    const totalsByCat: Record<string, number> = {};
    for (const e of entries) {
      // Roll subcategory amounts into parent
      const cat = categories.find((c) => c.id === e.category_id);
      if (!cat) continue;
      const rootId = cat.parent_id ?? cat.id;
      totalsByCat[rootId] = (totalsByCat[rootId] || 0) + e.amount;
    }
    return Object.entries(totalsByCat)
      .map(([id, total]) => {
        const cat = categories.find((c) => c.id === id);
        return { name: cat?.name ?? "—", value: total, kind: cat?.kind };
      })
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [categories, entries]);

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 text-sm text-muted-foreground">
        Adicione lançamentos para ver os gráficos
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-elegant)]">
        <h3 className="mb-3 text-sm font-semibold tracking-tight">Distribuição</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.75rem",
                  color: "var(--popover-foreground)",
                }}
                formatter={(v) => formatBRL(Number(v))}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-elegant)]">
        <h3 className="mb-3 text-sm font-semibold tracking-tight">Por categoria</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: -10, right: 8, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.75rem",
                }}
                formatter={(v: number) => formatBRL(v)}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
