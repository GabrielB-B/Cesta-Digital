import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { AppLoading } from "../components/AppLoading";
import { useAuth } from "../contexts/useAuth";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <AppLoading label="Carregando sessao..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
