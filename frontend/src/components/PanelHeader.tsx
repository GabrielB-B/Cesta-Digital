import type { ReactNode } from "react";

interface PanelHeaderProps {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  stacked?: boolean;
}

export function PanelHeader({
  eyebrow,
  title,
  description,
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
        {description ? (
          <p className="panel-card__description">{description}</p>
        ) : null}
      </div>

      {actions}
    </div>
  );
}
