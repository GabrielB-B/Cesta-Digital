import type { InputHTMLAttributes } from "react";
import styles from "./CurrencyInput.module.css";

type CurrencyInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "inputMode" | "min" | "step" | "type"
>;

export function CurrencyInput({ onFocus, ...props }: CurrencyInputProps) {
  return (
    <div className={styles.currencyInput}>
      <span className={styles.prefix} aria-hidden="true">
        R$
      </span>
      <input
        {...props}
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        onFocus={(event) => {
          if (Number(event.currentTarget.value) === 0) {
            event.currentTarget.select();
          }
          onFocus?.(event);
        }}
      />
    </div>
  );
}
