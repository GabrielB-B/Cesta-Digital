import { BrandLockup } from "./BrandLockup";

export function LoginSuccessOverlay() {
  return (
    <div
      className="login-success-overlay"
      role="status"
      aria-live="polite"
      aria-label="Entrada confirmada no Cesta Digital"
    >
      <div className="login-success-overlay__mark" aria-hidden="true">
        <BrandLockup variant="compact" title="Cesta Digital" subtitle="" markOnly />
      </div>
    </div>
  );
}
