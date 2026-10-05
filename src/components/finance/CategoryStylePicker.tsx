import { useEffect, useState } from "react";
import { Palette } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import type { Category } from "@/hooks/use-finance";

const ICONS = [
  "🏠", "🚗", "🍞", "🛒", "🥩", "🥬", "💊", "🏥", "📱", "🌐", "💡", "💧",
  "⛽", "🚌", "🎓", "🏋️", "☕", "🍽️", "👕", "🎁", "🐶", "👶", "👵", "✈️",
  "🎮", "📺", "💳", "🏦", "💰", "📈", "🐷", "🧾", "🔧", "🛡️", "💼", "❤️",
];
const COLORS = [
  "#10b981", "#22c55e", "#84cc16", "#eab308", "#f59e0b", "#f97316",
  "#ef4444", "#ec4899", "#a855f7", "#6366f1", "#3b82f6", "#06b6d4",
  "#14b8a6", "#64748b",
];

export function CategoryStylePicker({ category }: { category: Category }) {
  const [icon, setIcon] = useState<string | null>(category.icon ?? null);
  const [color, setColor] = useState<string | null>(category.color ?? null);
  useEffect(() => {
    setIcon(category.icon ?? null);
    setColor(category.color ?? null);
  }, [category.icon, category.color]);

  const save = async (patch: { icon?: string | null; color?: string | null }) => {
    if ("icon" in patch) setIcon(patch.icon ?? null);
    if ("color" in patch) setColor(patch.color ?? null);
    const { error } = await supabase.from("categories").update(patch).eq("id", category.id);
    if (error) {
      toast.error("Não foi possível salvar o estilo");
      return;
    }
    window.dispatchEvent(new CustomEvent("finance:categories-changed"));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          title="Escolher ícone e cor"
          onClick={(e) => e.stopPropagation()}
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border text-base transition-transform hover:scale-110"
          style={color ? { backgroundColor: `${color}33`, borderColor: color } : undefined}
        >
          {icon ?? <Palette className="h-4 w-4 text-muted-foreground" />}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-72" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 text-xs font-semibold text-muted-foreground">Ícone</div>
        <div className="grid grid-cols-8 gap-1">
          {ICONS.map((ic) => (
            <button
              key={ic}
              type="button"
              onClick={() => save({ icon: ic })}
              className={`cursor-pointer rounded-md p-1 text-lg hover:bg-muted ${icon === ic ? "bg-muted ring-1 ring-primary" : ""}`}
            >
              {ic}
            </button>
          ))}
        </div>
        <div className="mb-2 mt-3 text-xs font-semibold text-muted-foreground">Cor</div>
        <div className="grid grid-cols-7 gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => save({ color: c })}
              className={`h-7 w-7 cursor-pointer rounded-full transition-transform hover:scale-110 ${color === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-popover" : ""}`}
              style={{ backgroundColor: c }}
              aria-label={`Cor ${c}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => save({ icon: null, color: null })}
          className="mt-3 w-full cursor-pointer rounded-md border border-border py-1.5 text-xs text-muted-foreground hover:bg-muted"
        >
          Remover personalização
        </button>
      </PopoverContent>
    </Popover>
  );
}
