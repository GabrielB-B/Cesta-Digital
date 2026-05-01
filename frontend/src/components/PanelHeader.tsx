import type { ReactNode } from "react";

interface PanelHeaderProps {
  eyebrow: string;
  title: string;
  actions?: ReactNode;
  stacked?: boolean;
}

export function PanelHeader({
  eyebrow,
  title,
  actions,
  stacked = false,
}: PanelHeaderProps) {
  const classes = ["panel-card__header"];

  if (stacked) {
    classes.push("panel-card__header--stack");
  } else if (actions) {
    classes.push("panel-card__header--actions");
  }

  return (
    <div className={classes.join(" ")}>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h3>{title}</h3>
      </div>

      {actions}
    </div>
  );
}
