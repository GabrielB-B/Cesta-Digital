import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  className,
}: PageHeaderProps) {
  const classes = ["hero-card", className].filter(Boolean).join(" ");

  return (
    <section className={classes}>
      <div className="hero-card__main">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="hero-card__description">{description}</p>
        </div>

        {actions ? <div className="hero-actions">{actions}</div> : null}
      </div>

      {meta ? <div className="hero-card__side">{meta}</div> : null}
    </section>
  );
}
