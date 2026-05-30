import { BrandLockup } from "./BrandLockup";

interface AppLoadingProps {
  label?: string;
  fullScreen?: boolean;
}

export function AppLoading({
  label = "Carregando Cesta Digital...",
  fullScreen = true,
}: AppLoadingProps) {
  const className = ["app-loading", fullScreen ? "app-loading--fullscreen" : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className} role="status" aria-live="polite" aria-label={label}>
      <BrandLockup variant="compact" title="Cesta Digital" subtitle="" markOnly />
      <span className="sr-only">{label}</span>
    </div>
  );
}
