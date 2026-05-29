export interface RoleOptionResponse {
  id: number;
  name: string;
  description: string | null;
}

export interface UserAdminResponse {
  id: number;
  name: string;
  login_name: string;
  email: string;
  is_active: boolean;
  roles: string[];
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserCreatePayload {
  name: string;
  login_name: string;
  email: string;
  password: string;
  is_active: boolean;
  roles: string[];
}

export interface UserUpdatePayload {
  name: string;
  login_name: string;
  email: string;
  is_active: boolean;
  roles: string[];
}

export interface UserPasswordResetPayload {
  new_password: string;
}
