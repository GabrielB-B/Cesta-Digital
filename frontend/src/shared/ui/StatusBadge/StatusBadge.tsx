import type { HTMLAttributes, ReactNode } from "react";
import styles from "./StatusBadge.module.css";

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
  children: ReactNode;
}

export function StatusBadge({
  children,
  className = "",
  tone = "neutral",
  ...props
}: StatusBadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[tone]} ${className}`} {...props}>
      <span className={styles.dot} aria-hidden="true" />
      {children}
    </span>
  );
}
