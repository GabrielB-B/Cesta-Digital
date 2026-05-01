import type { ReactNode } from "react";

type StateMessageVariant = "empty" | "loading" | "error" | "success";

interface StateMessageProps {
  children: ReactNode;
  variant?: StateMessageVariant;
}

export function StateMessage({
  children,
  variant = "empty",
}: StateMessageProps) {
  let className = "empty-state";

  if (variant === "error") {
    className = "status-error";
  } else if (variant === "success") {
    className = "status-success";
  }

  return (
    <p
      className={className}
      role={variant === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      {children}
    </p>
  );
}
