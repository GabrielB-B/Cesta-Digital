import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "../api/client";
import type {
  AuthContextData,
  CurrentUserResponse,
  LoginResponse,
} from "../types/auth";

const AuthContext = createContext<AuthContextData | undefined>(undefined);

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

  const loadCurrentUser = useCallback(async () => {
    const storedToken = localStorage.getItem("cesta_digital_token");

    if (!storedToken) {
      setUser(null);
      return;
    }

    try {
      const response = await api.get<CurrentUserResponse>("/auth/me");
      setUser(response.data);
    } catch {
      localStorage.removeItem("cesta_digital_token");
      setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void loadCurrentUser();
  }, [loadCurrentUser]);

  const login = useCallback(async (email: string, password: string) => {
    const body = new URLSearchParams();
    body.append("username", email);
    body.append("password", password);
    body.append("grant_type", "password");

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
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("cesta_digital_token");
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextData>(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      user,
      login,
      logout,
    }),
    [token, user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextData {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }

  return context;
}
