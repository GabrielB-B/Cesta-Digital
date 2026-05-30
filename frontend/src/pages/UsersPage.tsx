import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api } from "../api/client";
import { DataTable } from "../components/DataTable";
import { PageHeader } from "../components/PageHeader";
import { PanelHeader } from "../components/PanelHeader";
import { StateMessage } from "../components/StateMessage";
import { getApiErrorMessage } from "../utils/api-error";
import { formatDateTime } from "../utils/format";
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
  login_name: "",
  email: "",
  password: "",
  is_active: true,
  roles: [] as string[],
};

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  lider_social: "Lideranca social",
  operador: "Operador",
};

const roleDescriptions: Record<string, string> = {
  admin: "Acesso completo a usuarios, auditoria e configuracoes administrativas.",
  lider_social: "Acompanha familias, beneficios, avaliacoes sociais e financeiro.",
  operador: "Cuida de estoque, tipos de cesta, agendamentos e entregas.",
};

function formatRole(role: string): string {
  return roleLabels[role] ?? role;
}

function formatRoleDescription(role: string, fallback?: string | null): string {
  return roleDescriptions[role] ?? fallback ?? "Permissao operacional do sistema.";
}

function formatLastLogin(value: string | null): string {
  if (!value) {
    return "Nunca entrou";
  }

  return formatDateTime(value);
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
      setError(getApiErrorMessage(err, "Nao foi possivel carregar os usuarios."));
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

  const summary = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((user) => user.is_active).length,
      admins: users.filter((user) => user.roles.includes("admin")).length,
      inactive: users.filter((user) => !user.is_active).length,
    };
  }, [users]);

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
      login_name: user.login_name,
      email: user.email,
      password: "",
      is_active: user.is_active,
      roles: user.roles,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!formData.name.trim() || !formData.login_name.trim() || !formData.email.trim()) {
      setError("Nome, login e email de recuperacao sao obrigatorios.");
      return;
    }

    if (formData.roles.length === 0) {
      setError("Selecione pelo menos uma permissao de acesso.");
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
          login_name: formData.login_name.trim().toLowerCase(),
          email: formData.email.trim(),
          is_active: formData.is_active,
          roles: formData.roles,
        };

        await api.put(`/users/${editingUserId}`, payload);
      } else {
        const payload: UserCreatePayload = {
          name: formData.name.trim(),
          login_name: formData.login_name.trim().toLowerCase(),
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
    <div className="page-stack users-page">
      <PageHeader
        eyebrow="Administracao"
        title="Usuarios e permissoes"
        description="Gerencie quem pode acessar o sistema e quais funcoes cada pessoa pode usar."
        meta={
          <div className="audit-summary-grid" aria-label="Resumo de usuarios">
            <div className="audit-summary-card">
              <span>Usuarios</span>
              <strong>{summary.total}</strong>
            </div>
            <div className="audit-summary-card">
              <span>Ativos</span>
              <strong>{summary.active}</strong>
            </div>
            <div className="audit-summary-card">
              <span>Administradores</span>
              <strong>{summary.admins}</strong>
            </div>
            <div className="audit-summary-card">
              <span>Inativos</span>
              <strong>{summary.inactive}</strong>
            </div>
          </div>
        }
      />

      <section className="content-grid users-admin-grid">
        <form onSubmit={handleSubmit} className="panel-card form-panel users-form-panel">
          <PanelHeader
            eyebrow={editingUser ? "Edicao" : "Novo acesso"}
            title={editingUser ? "Editar usuario" : "Cadastrar usuario"}
          />

          <div className="form-grid">
            <label className="form__group">
              <span>Nome da pessoa</span>
              <input
                value={formData.name}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
                placeholder="Ex.: Maria Souza"
                required
              />
            </label>

            <label className="form__group">
              <span>Login de acesso</span>
              <input
                value={formData.login_name}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    login_name: event.target.value,
                  }))
                }
                autoComplete="username"
                placeholder="Ex.: maria.souza"
                pattern="[a-z0-9._-]{3,80}"
                spellCheck={false}
                required
              />
            </label>

            <label className="form__group">
              <span>Email de recuperacao</span>
              <input
                type="email"
                value={formData.email}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    email: event.target.value,
                  }))
                }
                placeholder="nome@dominio.com"
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
                  autoComplete="new-password"
                  required
                />
              </label>
            ) : null}
          </div>

          <p className="table-muted">{PASSWORD_POLICY_HINT}</p>

          <div className="users-permission-block">
            <div>
              <p className="eyebrow">Permissoes</p>
              <h3>Funcoes liberadas</h3>
            </div>

            <div className="checkbox-grid role-choice-grid">
              <label className="checkbox-card role-choice">
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
                <span>
                  <strong>Usuario ativo</strong>
                  <small>Pode entrar no sistema enquanto estiver ativo.</small>
                </span>
              </label>

              {roles.map((role) => (
                <label key={role.id} className="checkbox-card role-choice">
                  <input
                    type="checkbox"
                    checked={formData.roles.includes(role.name)}
                    onChange={() => toggleRole(role.name)}
                  />
                  <span>
                    <strong>{formatRole(role.name)}</strong>
                    <small>{formatRoleDescription(role.name, role.description)}</small>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {editingUser ? (
            <div className="inline-panel">
              <PanelHeader eyebrow="Seguranca" title="Redefinir senha" />

              <p className="table-muted">{PASSWORD_POLICY_HINT}</p>

              <div className="toolbar toolbar--row">
                <label className="toolbar__field">
                  <span className="sr-only">Nova senha forte</span>
                  <input
                    className="toolbar__input"
                    type="password"
                    name="password_reset"
                    value={passwordReset}
                    onChange={(event) => setPasswordReset(event.target.value)}
                    placeholder="Nova senha forte..."
                    autoComplete="new-password"
                  />
                </label>

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

          {error ? <StateMessage variant="error">{error}</StateMessage> : null}

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

        <section className="panel-card users-table-panel">
          <PanelHeader eyebrow="Permissoes" title="Pessoas com acesso" />

          {isLoading ? (
            <StateMessage variant="loading">Carregando usuarios...</StateMessage>
          ) : users.length === 0 ? (
            <StateMessage>Nenhum usuario cadastrado ainda.</StateMessage>
          ) : (
            <DataTable caption="Usuarios e permissoes cadastrados">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Login</th>
                  <th>Email</th>
                  <th>Permissoes</th>
                  <th>Status</th>
                  <th>Ultima entrada</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="table-cell--truncate" title={user.name}>
                      <strong>{user.name}</strong>
                    </td>
                    <td className="table-cell--nowrap" title={user.login_name}>
                      <span className="inline-code">@{user.login_name}</span>
                    </td>
                    <td className="table-cell--truncate" title={user.email}>
                      {user.email}
                    </td>
                    <td>
                      <div className="role-badge-list">
                        {user.roles.map((role) => (
                          <span className="role-badge" key={`${user.id}-${role}`}>
                            {formatRole(role)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      {user.is_active ? (
                        <span className="audit-status audit-status--success">Ativo</span>
                      ) : (
                        <span className="audit-status audit-status--danger">Inativo</span>
                      )}
                    </td>
                    <td className="table-cell--nowrap">
                      {formatLastLogin(user.last_login_at)}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="button button--secondary button--small"
                          onClick={() => startEditing(user)}
                        >
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </section>
      </section>
    </div>
  );
}
