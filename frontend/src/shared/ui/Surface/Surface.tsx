import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Surface.module.css";

export interface SurfaceProps extends HTMLAttributes<HTMLElement> {
  as?: "div" | "section" | "article";
  children: ReactNode;
  padding?: "none" | "sm" | "md";
}

export function Surface({
  as: Element = "section",
  children,
  className = "",
  padding = "md",
  ...props
}: SurfaceProps) {
  return (
    <Element className={`${styles.surface} ${styles[padding]} ${className}`} {...props}>
      {children}
    </Element>
  );
}
