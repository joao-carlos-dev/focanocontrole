import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { formatMoneyValue, normalizeExternal, parseMoneyText } from "@/lib/money-parse";

type MoneyInputProps = Omit<
  ComponentProps<typeof Input>,
  "type" | "value" | "onChange" | "defaultValue"
> & {
  value: string;
  onValueChange: (value: string) => void;
};

export function MoneyInput({ value, onValueChange, ...props }: MoneyInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const tentative = useRef(false);
  const internal = useRef(normalizeExternal(value));
  const [display, setDisplay] = useState(() => formatMoneyValue(internal.current));

  // Sync when the parent changes the value (reset, edit start, etc.).
  useEffect(() => {
    const ext = normalizeExternal(value);
    if (ext !== internal.current && Number(ext || 0) !== Number(internal.current || 0)) {
      internal.current = ext;
      tentative.current = false;
      setDisplay(formatMoneyValue(ext));
    } else if (!value && internal.current) {
      internal.current = "";
      tentative.current = false;
      setDisplay("");
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const raw = el.value;
    const fromEnd = raw.length - (el.selectionStart ?? raw.length);
    const next = parseMoneyText(raw, tentative.current);
    tentative.current = next.tentative;
    internal.current = next.value;
    const formatted = formatMoneyValue(next.value);
    setDisplay(formatted);
    onValueChange(next.value);
    requestAnimationFrame(() => {
      const input = ref.current;
      if (!input || document.activeElement !== input) return;
      const pos = Math.max(0, formatted.length - fromEnd);
      input.setSelectionRange(pos, pos);
    });
  };

  return (
    <Input
      {...props}
      ref={ref}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={display}
      onChange={handleChange}
    />
  );
}
