import brandLogo from "../../img/IMG_1909.PNG";

type BrandLockupVariant = "login" | "sidebar" | "compact";

interface BrandLockupProps {
  variant?: BrandLockupVariant;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
}

export function BrandLockup({
  variant = "sidebar",
  eyebrow,
  title = "Cesta Digital",
  subtitle = "UPG | Gestao social e operacional",
}: BrandLockupProps) {
  return (
    <div className={`brand-lockup brand-lockup--${variant}`} translate="no">
      <div className="brand-lockup__mark-shell" aria-hidden="true">
        <img
          className="brand-lockup__mark"
          src={brandLogo}
          alt=""
          width="1365"
          height="2048"
          decoding="async"
        />
      </div>

      <div className="brand-lockup__content">
        {eyebrow ? <span className="brand-lockup__eyebrow">{eyebrow}</span> : null}
        <strong className="brand-lockup__title">{title}</strong>
        {subtitle ? <p className="brand-lockup__subtitle">{subtitle}</p> : null}
      </div>
    </div>
  );
}
