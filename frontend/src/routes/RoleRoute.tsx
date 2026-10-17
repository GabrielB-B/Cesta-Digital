import type { ReactNode } from "react";
import { AppLoading } from "../components/AppLoading";
import { useAuth } from "../contexts/useAuth";
import { AccessDeniedPage } from "../pages/AccessDeniedPage";
import { userHasAnyRole } from "./routeAccess";
import type { AppRole } from "../types/auth";

interface RoleRouteProps {
  allowedRoles: readonly AppRole[];
  children: ReactNode;
}

export function RoleRoute({ allowedRoles, children }: RoleRouteProps) {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return <AppLoading label="Carregando permissoes..." />;
  }

  const userRoles = user?.roles ?? [];
  const isAllowed = userHasAnyRole(userRoles, allowedRoles);

  if (!isAllowed) {
    return <AccessDeniedPage allowedRoles={allowedRoles} />;
  }

  return <>{children}</>;
}
