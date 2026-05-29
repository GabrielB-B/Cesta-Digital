import type { ReactNode } from "react";

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
}

export function MetricCard({
  title,
  value,
  description,
  tone = "neutral",
  emphasis = false,
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
    </article>
  );
}
