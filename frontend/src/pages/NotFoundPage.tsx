import { MapPinOff } from "lucide-react";
import { Link } from "react-router-dom";
import styles from "./SystemStatePage.module.css";

export function NotFoundPage() {
  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-labelledby="not-found-title">
        <span className={styles.icon} aria-hidden="true"><MapPinOff /></span>
        <p className={styles.eyebrow}>Página não encontrada</p>
        <h1 id="not-found-title">Este caminho não existe</h1>
        <p className={styles.description}>
          Confira o endereço ou retorne ao início para continuar.
        </p>
        <Link to="/" className={styles.action}>Voltar ao início</Link>
      </section>
    </main>
  );
}
