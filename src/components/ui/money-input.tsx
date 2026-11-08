import { NumericFormat } from "react-number-format";
import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";

type MoneyInputProps = Omit<ComponentProps<typeof Input>, "type" | "value" | "onChange" | "defaultValue"> & {
  value: string;
  onValueChange: (value: string) => void;
};

export function MoneyInput({ value, onValueChange, ...props }: MoneyInputProps) {
  return (
    <NumericFormat
      {...props}
      customInput={Input}
      value={value}
      valueIsNumericString
      onValueChange={(values) => onValueChange(values.value)}
      thousandSeparator="."
      decimalSeparator=","
      allowedDecimalSeparators={[","]}
      decimalScale={2}
      allowNegative={false}
      inputMode="decimal"
    />
  );
}