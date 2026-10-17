import type { ReactNode } from "react";
import styles from "./ResponsiveCollection.module.css";

export interface DataColumn<T> {
  key: string;
  header: string;
  align?: "start" | "end";
  render: (item: T) => ReactNode;
}

interface DataTableProps<T> {
  caption: string;
  columns: DataColumn<T>[];
  items: T[];
  getRowKey: (item: T) => string;
}

export function DataTable<T>({
  caption,
  columns,
  getRowKey,
  items,
}: DataTableProps<T>) {
  return (
    <div className={styles.tableViewport}>
      <table className={styles.table}>
        <caption className="cd-sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                className={column.align === "end" ? styles.alignEnd : undefined}
                key={column.key}
                scope="col"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={getRowKey(item)}>
              {columns.map((column) => (
                <td
                  className={column.align === "end" ? styles.alignEnd : undefined}
                  key={column.key}
                >
                  {column.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface MobileListProps<T> {
  ariaLabel: string;
  items: T[];
  getItemKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
}

export function MobileList<T>({
  ariaLabel,
  getItemKey,
  items,
  renderItem,
}: MobileListProps<T>) {
  return (
    <ul className={styles.mobileList} aria-label={ariaLabel}>
      {items.map((item) => (
        <li key={getItemKey(item)}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}
