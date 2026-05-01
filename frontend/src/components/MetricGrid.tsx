import type { ReactNode } from "react";
import { MetricCard } from "./MetricCard";

export interface MetricGridItem {
  title: string;
  value: ReactNode;
  description: ReactNode;
}

interface MetricGridProps {
  items: MetricGridItem[];
}

export function MetricGrid({ items }: MetricGridProps) {
  return (
    <section className="stats-grid">
      {items.map((item) => (
        <MetricCard
          key={item.title}
          title={item.title}
          value={item.value}
          description={item.description}
        />
      ))}
    </section>
  );
}
