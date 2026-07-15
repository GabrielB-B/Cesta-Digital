import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getRouteMeta } from "../routes/routeMeta";

const APP_TITLE = "Cesta Digital";

export function PageLifecycle() {
  const location = useLocation();

  useEffect(() => {
    const routeMeta = getRouteMeta(location.pathname);
    document.title = `${routeMeta.title} | ${APP_TITLE}`;

    const mainContent = document.getElementById("conteudo-principal");
    if (mainContent instanceof HTMLElement) {
      mainContent.focus({ preventScroll: true });
    }

    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location.pathname]);

  return null;
}

