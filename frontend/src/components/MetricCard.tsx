import type { ReactNode } from "react";

interface MetricCardProps {
  title: string;
  value: ReactNode;
  description: ReactNode;
}

export function MetricCard({ title, value, description }: MetricCardProps) {
  return (
    <article className="stat-card">
      <p className="stat-card__title">{title}</p>
      <strong className="stat-card__value">{value}</strong>
      <span className="stat-card__description">{description}</span>
    </article>
  );
}
