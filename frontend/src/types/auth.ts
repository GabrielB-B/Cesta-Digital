export type AppRole = "admin" | "lider_social" | "operador";

export interface CurrentUserResponse {
  id: number;
  name: string;
  login_name: string;
  email: string;
  is_active: boolean;
  roles: AppRole[];
}

export interface AuthContextData {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: CurrentUserResponse | null;
  login: (loginName: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
