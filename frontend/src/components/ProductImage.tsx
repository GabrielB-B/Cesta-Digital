import { useState } from "react";
import { Package } from "lucide-react";
import { getApiAssetUrl } from "../api/client";
import styles from "./ProductImage.module.css";

interface ProductImageProps {
  name: string;
  src?: string | null;
  size?: "compact" | "card" | "detail";
  className?: string;
  eager?: boolean;
}

export function ProductImage({
  name,
  src,
  size = "compact",
  className = "",
  eager = false,
}: ProductImageProps) {
  const resolvedSrc = getApiAssetUrl(src);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const hasUsableImage = resolvedSrc !== null && failedSrc !== resolvedSrc;

  return (
    <span
      className={`${styles.frame} ${styles[size]} ${className}`.trim()}
      data-has-image={hasUsableImage ? "true" : "false"}
    >
      {hasUsableImage ? (
        <img
          src={resolvedSrc}
          alt={`Produto ${name}`}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailedSrc(resolvedSrc)}
        />
      ) : (
        <span className={styles.fallback} role="img" aria-label={`Sem imagem cadastrada para ${name}`}>
          <Package aria-hidden="true" />
        </span>
      )}
    </span>
  );
}
