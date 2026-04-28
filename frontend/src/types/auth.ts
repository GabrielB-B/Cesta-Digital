export interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  name: string;
  email: string;
  roles: string[];
}

export interface CurrentUserResponse {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  roles: string[];
}

export interface AuthContextData {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: CurrentUserResponse | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}
