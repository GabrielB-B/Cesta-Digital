import type { ReactNode } from "react";
import { PanelHeader } from "./PanelHeader";

interface FormSectionProps {
  eyebrow: string;
  title: string;
  children: ReactNode;
  gridClassName?: string;
}

export function FormSection({
  eyebrow,
  title,
  children,
  gridClassName = "form-grid",
}: FormSectionProps) {
  return (
    <section className="form-section">
      <PanelHeader eyebrow={eyebrow} title={title} />
      <div className={gridClassName}>{children}</div>
    </section>
  );
}
