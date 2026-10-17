import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import styles from "./TextField.module.css";

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  leadingIcon?: ReactNode;
}

export function TextField({
  className = "",
  error,
  hint,
  id,
  label,
  leadingIcon,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = hint || error ? `${inputId}-description` : undefined;

  return (
    <div className={`${styles.field} ${className}`}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      <div className={`${styles.control} ${error ? styles.invalid : ""}`}>
        {leadingIcon ? <span className={styles.icon}>{leadingIcon}</span> : null}
        <input
          className={styles.input}
          id={inputId}
          aria-describedby={descriptionId}
          aria-invalid={error ? true : undefined}
          {...props}
        />
      </div>
      {hint || error ? (
        <p
          className={error ? styles.error : styles.hint}
          id={descriptionId}
          role={error ? "alert" : undefined}
        >
          {error ?? hint}
        </p>
      ) : null}
    </div>
  );
}
