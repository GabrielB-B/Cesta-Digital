import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export type MetricCardTone =
  | "neutral"
  | "social"
  | "stock"
  | "delivery"
  | "attention";

interface MetricCardProps {
  title: string;
  value: ReactNode;
  description: ReactNode;
  tone?: MetricCardTone;
  emphasis?: boolean;
  actionTo?: string;
  actionLabel?: string;
}

export function MetricCard({
  title,
  value,
  description,
  tone = "neutral",
  emphasis = false,
  actionTo,
  actionLabel,
}: MetricCardProps) {
  const className = [
    "stat-card",
    `stat-card--${tone}`,
    emphasis ? "stat-card--emphasis" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={className}>
      <p className="stat-card__title">{title}</p>
      <strong className="stat-card__value">{value}</strong>
      <span className="stat-card__description">{description}</span>
      {actionTo && actionLabel ? (
        <Link className="stat-card__action" to={actionTo}>
          {actionLabel}
        </Link>
      ) : null}
    </article>
  );
}
