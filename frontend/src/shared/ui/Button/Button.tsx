import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  loading?: boolean;
}

export function Button({
  children,
  className = "",
  disabled,
  leadingIcon,
  loading = false,
  size = "md",
  type = "button",
  variant = "secondary",
  ...props
}: ButtonProps) {
  const classes = [styles.button, styles[variant], styles[size], className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      type={type}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : leadingIcon}
      <span>{children}</span>
    </button>
  );
}
