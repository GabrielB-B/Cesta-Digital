import type { InputHTMLAttributes } from "react";

type CurrencyInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "inputMode" | "min" | "step" | "type"
>;

export function CurrencyInput(props: CurrencyInputProps) {
  return (
    <div className="currency-input">
      <span className="currency-input__prefix" aria-hidden="true">
        R$
      </span>
      <input
        {...props}
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
      />
    </div>
  );
}
