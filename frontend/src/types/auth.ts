export interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  name: string;
  login_name: string;
  email: string;
  roles: string[];
}

export interface CurrentUserResponse {
  id: number;
  name: string;
  login_name: string;
  email: string;
  is_active: boolean;
  roles: string[];
}

export interface AuthContextData {
  /** Mantido apenas por compatibilidade; a sessão real usa cookie HttpOnly. */
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: CurrentUserResponse | null;
  login: (loginName: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
