import type { ReactNode } from "react";
import { BrandLockup } from "./BrandLockup";

type StateMessageVariant = "empty" | "loading" | "error" | "success";

interface StateMessageProps {
  children: ReactNode;
  variant?: StateMessageVariant;
}

export function StateMessage({
  children,
  variant = "empty",
}: StateMessageProps) {
  if (variant === "loading") {
    return (
      <div className="empty-state empty-state--loading" role="status" aria-live="polite">
        <BrandLockup variant="compact" title="Cesta Digital" subtitle="" markOnly />
        <span>{children}</span>
      </div>
    );
  }

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
