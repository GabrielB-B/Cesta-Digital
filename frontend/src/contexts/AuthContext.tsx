import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "../api/client";
import { AuthContext } from "./auth-context";
import type {
  AuthContextData,
  CurrentUserResponse,
  LoginResponse,
} from "../types/auth";

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Provider responsável por autenticação, persistência do token
 * e carregamento do usuário atual.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("cesta_digital_token")
  );
  const [user, setUser] = useState<CurrentUserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(token));

  useEffect(() => {
    let isMounted = true;

    if (!token) {
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    async function loadCurrentUser() {
      if (isMounted) {
        setIsLoading(true);
      }

      try {
        const response = await api.get<CurrentUserResponse>("/auth/me");

        if (isMounted) {
          setUser(response.data);
        }
      } catch {
        localStorage.removeItem("cesta_digital_token");

        if (isMounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);

    const body = new URLSearchParams();
    body.append("username", email);
    body.append("password", password);
    body.append("grant_type", "password");

    try {
      const response = await api.post<LoginResponse>("/auth/login", body, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      localStorage.setItem("cesta_digital_token", response.data.access_token);
      setToken(response.data.access_token);

      const meResponse = await api.get<CurrentUserResponse>("/auth/me", {
        headers: {
          Authorization: `Bearer ${response.data.access_token}`,
        },
      });

      setUser(meResponse.data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("cesta_digital_token");
    setToken(null);
    setUser(null);
    setIsLoading(false);
  }, []);

  const value = useMemo<AuthContextData>(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      isLoading,
      user,
      login,
      logout,
    }),
    [token, isLoading, user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
