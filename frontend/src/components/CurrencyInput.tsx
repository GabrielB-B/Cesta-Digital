import type { InputHTMLAttributes } from "react";
import styles from "./CurrencyInput.module.css";

type CurrencyInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "inputMode" | "min" | "step" | "type"
>;

export function CurrencyInput(props: CurrencyInputProps) {
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
      />
    </div>
  );
}
