import type { ReactNode } from "react";
import { PanelHeader } from "./PanelHeader";

interface FormSectionProps {
  id?: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
  gridClassName?: string;
}

export function FormSection({
  id,
  eyebrow,
  title,
  children,
  gridClassName = "form-grid",
}: FormSectionProps) {
  return (
    <section id={id} className="form-section">
      <PanelHeader eyebrow={eyebrow} title={title} />
      <div className={gridClassName}>{children}</div>
    </section>
  );
}
