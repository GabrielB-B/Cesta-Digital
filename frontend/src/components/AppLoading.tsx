import styles from "./AppLoading.module.css";

interface AppLoadingProps {
  label?: string;
  fullScreen?: boolean;
}

export function AppLoading({
  label = "Carregando Cesta Digital...",
  fullScreen = true,
}: AppLoadingProps) {
  const className = [styles.loading, fullScreen ? styles.fullScreen : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className} role="status" aria-live="polite" aria-label={label}>
      <img
        className={styles.mark}
        src="/brand/cesta-digital-symbol.png"
        alt=""
        width="72"
        height="72"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
