import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api } from "../api/client";
import { AuthContext } from "./auth-context";
import type { AuthContextData, CurrentUserResponse } from "../types/auth";

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Provider responsável por autenticação, persistência do token
 * e carregamento do usuário atual.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<CurrentUserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const authRequestGenerationRef = useRef(0);

  useEffect(() => {
    let isMounted = true;
    const requestGeneration = ++authRequestGenerationRef.current;

    async function loadCurrentUser() {
      if (isMounted) {
        setIsLoading(true);
      }

      try {
        const response = await api.get<CurrentUserResponse>("/auth/me");

        if (
          isMounted &&
          requestGeneration === authRequestGenerationRef.current
        ) {
          setUser(response.data);
        }
      } catch {
        if (
          isMounted &&
          requestGeneration === authRequestGenerationRef.current
        ) {
          setUser(null);
        }
      } finally {
        if (
          isMounted &&
          requestGeneration === authRequestGenerationRef.current
        ) {
          setIsLoading(false);
        }
      }
    }

    void loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (loginName: string, password: string) => {
    const requestGeneration = ++authRequestGenerationRef.current;
    setIsLoading(true);

    const body = new URLSearchParams();
    body.append("username", loginName);
    body.append("password", password);
    body.append("grant_type", "password");

    try {
      await api.post("/auth/login", body, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const meResponse = await api.get<CurrentUserResponse>("/auth/me");

      if (requestGeneration === authRequestGenerationRef.current) {
        setUser(meResponse.data);
      }
    } finally {
      if (requestGeneration === authRequestGenerationRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const logout = useCallback(async () => {
    const requestGeneration = ++authRequestGenerationRef.current;
    try {
      await api.post("/auth/logout");
    } finally {
      if (requestGeneration === authRequestGenerationRef.current) {
        setUser(null);
        setIsLoading(false);
      }
    }
  }, []);

  const legacyToken = null;

  const value = useMemo<AuthContextData>(
    () => ({
      token: legacyToken,
      isAuthenticated: Boolean(user),
      isLoading,
      user,
      login,
      logout,
    }),
    [isLoading, user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
