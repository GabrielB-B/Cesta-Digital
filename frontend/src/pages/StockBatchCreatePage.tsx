import { StockBatchFormPanel } from "../components/StockBatchFormPanel";
import styles from "./StockBatchCreatePage.module.css";

export function StockBatchCreatePage() {
  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <p>Entradas</p>
        <h1>Registrar entrada</h1>
        <span>
          Cada recebimento gera um lote rastreável e atualiza o saldo do produto.
        </span>
      </header>
      <StockBatchFormPanel variant="page" />
    </div>
  );
}
