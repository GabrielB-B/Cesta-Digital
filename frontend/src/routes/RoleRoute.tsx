import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../contexts/useAuth";

interface RoleRouteProps {
  allowedRoles: string[];
  children: ReactNode;
}

export function RoleRoute({ allowedRoles, children }: RoleRouteProps) {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>Cesta Digital</h1>
          <p>Carregando permissões...</p>
        </div>
      </div>
    );
  }

  const userRoles = user?.roles ?? [];
  const isAllowed = allowedRoles.some((role) => userRoles.includes(role));

  if (!isAllowed) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
