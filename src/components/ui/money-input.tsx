import { NumericFormat } from "react-number-format";
import { Input } from "@/components/ui/input";

type MoneyInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "onChange" | "defaultValue"
> & {
  value: string;
  onValueChange: (value: string) => void;
};

export function MoneyInput({ value, onValueChange, ...props }: MoneyInputProps) {
  return (
    <NumericFormat
      {...props}
      customInput={Input}
      value={value}
      thousandSeparator="."
      decimalSeparator=","
      decimalScale={2}
      allowNegative={false}
      inputMode="decimal"
      autoComplete="off"
      onValueChange={(values) => onValueChange(values.value)}
    />
  );
}

export function moneyFormat(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
