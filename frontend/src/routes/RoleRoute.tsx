import type { ReactNode } from "react";
import { AppLoading } from "../components/AppLoading";
import { useAuth } from "../contexts/useAuth";
import { AccessDeniedPage } from "../pages/AccessDeniedPage";

interface RoleRouteProps {
  allowedRoles: string[];
  children: ReactNode;
}

export function RoleRoute({ allowedRoles, children }: RoleRouteProps) {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return <AppLoading label="Carregando permissoes..." />;
  }

  const userRoles = user?.roles ?? [];
  const isAllowed = allowedRoles.some((role) => userRoles.includes(role));

  if (!isAllowed) {
    return <AccessDeniedPage allowedRoles={allowedRoles} />;
  }

  return <>{children}</>;
}
