import type { ReactNode } from "react";
import { MetricCard, type MetricCardTone } from "./MetricCard";

export interface MetricGridItem {
  title: string;
  value: ReactNode;
  description: ReactNode;
  tone?: MetricCardTone;
  emphasis?: boolean;
}

interface MetricGridProps {
  items: MetricGridItem[];
  className?: string;
}

export function MetricGrid({ items, className }: MetricGridProps) {
  const classes = ["stats-grid", className].filter(Boolean).join(" ");

  return (
    <section className={classes}>
      {items.map((item) => (
        <MetricCard
          key={item.title}
          title={item.title}
          value={item.value}
          description={item.description}
          tone={item.tone}
          emphasis={item.emphasis}
        />
      ))}
    </section>
  );
}
