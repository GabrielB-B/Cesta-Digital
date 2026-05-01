import type { ReactNode } from "react";

interface FormActionsProps {
  children: ReactNode;
  spread?: boolean;
}

export function FormActions({ children, spread = false }: FormActionsProps) {
  const classes = ["panel-actions"];

  if (spread) {
    classes.push("panel-actions--spread");
  }

  return <div className={classes.join(" ")}>{children}</div>;
}
