import type { ReactNode } from "react";

interface DataTableProps {
  caption: string;
  children: ReactNode;
}

export function DataTable({ caption, children }: DataTableProps) {
  return (
    <div className="table-wrapper">
      <table className="data-table">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}
