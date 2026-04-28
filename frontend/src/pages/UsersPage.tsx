import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { getApiErrorMessage } from "../utils/api-error";
import { isStrongPassword, PASSWORD_POLICY_HINT } from "../utils/password";
import type {
  RoleOptionResponse,
  UserAdminResponse,
  UserCreatePayload,
  UserPasswordResetPayload,
  UserUpdatePayload,
} from "../types/user";

const initialFormState = {
  name: "",
  email: "",
  password: "",
  is_active: true,
  roles: [] as string[],
};

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Nunca";
  }

  return new Date(value).toLocaleString("pt-BR");
}

export function UsersPage() {
  const [users, setUsers] = useState<UserAdminResponse[]>([]);
  const [roles, setRoles] = useState<RoleOptionResponse[]>([]);
  const [formData, setFormData] = useState(initialFormState);
  const [passwordReset, setPasswordReset] = useState("");
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setIsLoading(true);
      setError("");

      const [usersResponse, rolesResponse] = await Promise.all([
        api.get<UserAdminResponse[]>("/users"),
        api.get<RoleOptionResponse[]>("/users/roles"),
      ]);

      setUsers(usersResponse.data);
      setRoles(rolesResponse.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Nao foi possivel carregar os dados de usuarios."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const editingUser = useMemo(() => {
    return users.find((user) => user.id === editingUserId) ?? null;
  }, [editingUserId, users]);

  function resetForm() {
    setEditingUserId(null);
    setPasswordReset("");
    setFormData(initialFormState);
  }

  function toggleRole(roleName: string) {
    setFormData((previous) => {
      const hasRole = previous.roles.includes(roleName);

      return {
        ...previous,
        roles: hasRole
          ? previous.roles.filter((role) => role !== roleName)
          : [...previous.roles, roleName],
      };
    });
  }

  function startEditing(user: UserAdminResponse) {
    setEditingUserId(user.id);
    setPasswordReset("");
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      is_active: user.is_active,
      roles: user.roles,
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!formData.name.trim() || !formData.email.trim()) {
      setError("Nome e email sao obrigatorios.");
      return;
    }

    if (formData.roles.length === 0) {
      setError("Selecione pelo menos um perfil.");
      return;
    }

    if (!editingUserId && !isStrongPassword(formData.password)) {
      setError(PASSWORD_POLICY_HINT);
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingUserId) {
        const payload: UserUpdatePayload = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          is_active: formData.is_active,
          roles: formData.roles,
        };

        await api.put(`/users/${editingUserId}`, payload);
      } else {
        const payload: UserCreatePayload = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password.trim(),
          is_active: formData.is_active,
          roles: formData.roles,
        };

        await api.post("/users", payload);
      }

      resetForm();
      await loadData();
    } catch (err) {
      setError(getApiErrorMessage(err, "Nao foi possivel salvar o usuario."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasswordReset() {
    if (!editingUserId) {
      return;
    }

    setError("");

    if (!isStrongPassword(passwordReset)) {
      setError(PASSWORD_POLICY_HINT);
      return;
    }

    setIsResettingPassword(true);

    try {
      const payload: UserPasswordResetPayload = {
        new_password: passwordReset.trim(),
      };

      await api.put(`/users/${editingUserId}/password`, payload);
      setPasswordReset("");
      await loadData();
    } catch (err) {
      setError(getApiErrorMessage(err, "Nao foi possivel redefinir a senha."));
    } finally {
      setIsResettingPassword(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Administracao</p>
          <h2>Usuarios e perfis</h2>
          <p className="hero-card__description">
            Gerencie acessos, perfis e status de operadores, lideranca social e
            administradores do sistema.
          </p>
        </div>
      </section>

      <section className="content-grid">
        <form onSubmit={handleSubmit} className="panel-card form-panel">
          <div className="panel-card__header">
            <div>
              <p className="eyebrow">{editingUser ? "Edicao" : "Novo usuario"}</p>
              <h3>{editingUser ? "Editar usuario" : "Cadastrar usuario"}</h3>
            </div>
          </div>

          <div className="form-grid">
            <label className="form__group">
              <span>Nome</span>
              <input
                value={formData.name}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label className="form__group">
              <span>Email</span>
              <input
                type="email"
                value={formData.email}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    email: event.target.value,
                  }))
                }
                required
              />
            </label>

            {!editingUser ? (
              <label className="form__group">
                <span>Senha inicial</span>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(event) =>
                    setFormData((previous) => ({
                      ...previous,
                      password: event.target.value,
                    }))
                  }
                  required
                />
              </label>
            ) : null}
          </div>

          <p className="table-muted">{PASSWORD_POLICY_HINT}</p>

          <div className="checkbox-grid">
            <label className="checkbox-card">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    is_active: event.target.checked,
                  }))
                }
              />
              <span>Usuario ativo</span>
            </label>

            {roles.map((role) => (
              <label key={role.id} className="checkbox-card">
                <input
                  type="checkbox"
                  checked={formData.roles.includes(role.name)}
                  onChange={() => toggleRole(role.name)}
                />
                <span>{role.name}</span>
              </label>
            ))}
          </div>

          {editingUser ? (
            <div className="inline-panel">
              <div className="panel-card__header">
                <div>
                  <p className="eyebrow">Senha</p>
                  <h3>Redefinir senha</h3>
                </div>
              </div>

              <p className="table-muted">{PASSWORD_POLICY_HINT}</p>

              <div className="toolbar toolbar--row">
                <input
                  className="toolbar__input"
                  type="password"
                  value={passwordReset}
                  onChange={(event) => setPasswordReset(event.target.value)}
                  placeholder="Nova senha forte"
                />

                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => void handlePasswordReset()}
                  disabled={isResettingPassword}
                >
                  {isResettingPassword ? "Salvando..." : "Redefinir senha"}
                </button>
              </div>
            </div>
          ) : null}

          {error ? <p className="status-error">{error}</p> : null}

          <div className="panel-actions panel-actions--spread">
            <button
              type="button"
              className="button button--secondary"
              onClick={resetForm}
            >
              Limpar
            </button>

            <button type="submit" className="button" disabled={isSubmitting}>
              {isSubmitting
                ? "Salvando..."
                : editingUser
                  ? "Atualizar usuario"
                  : "Cadastrar usuario"}
            </button>
          </div>
        </form>

        <section className="panel-card">
          <div className="panel-card__header">
            <div>
              <p className="eyebrow">Consulta</p>
              <h3>Usuarios cadastrados</h3>
            </div>
          </div>

          {isLoading ? (
            <p className="empty-state">Carregando usuarios...</p>
          ) : users.length === 0 ? (
            <p className="empty-state">Nenhum usuario cadastrado.</p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Perfis</th>
                    <th>Status</th>
                    <th>Ultimo login</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.roles.join(", ")}</td>
                      <td>
                        {user.is_active ? (
                          <span className="pill pill--success">Ativo</span>
                        ) : (
                          <span className="pill pill--danger">Inativo</span>
                        )}
                      </td>
                      <td>{formatDateTime(user.last_login_at)}</td>
                      <td>
                        <button
                          type="button"
                          className="button button--secondary button--small"
                          onClick={() => startEditing(user)}
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
