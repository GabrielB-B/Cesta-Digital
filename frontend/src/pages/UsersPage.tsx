import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  KeyRound,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  UserCheck,
  UserRoundCog,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { AdministrationDialog } from "../components/AdministrationDialog";
import { AdministrationShell } from "../components/AdministrationShell";
import type {
  RoleOptionResponse,
  UserAdminResponse,
  UserCreatePayload,
  UserPasswordResetPayload,
  UserUpdatePayload,
} from "../types/user";
import { getApiErrorMessage } from "../utils/api-error";
import { formatDateTime } from "../utils/format";
import { isStrongPassword, PASSWORD_POLICY_HINT } from "../utils/password";
import {
  confirmDiscardUnsavedChanges,
  useUnsavedChangesWarning,
} from "../utils/unsaved-changes";
import styles from "./AdministrationPage.module.css";

type UserFormState = {
  name: string;
  login_name: string;
  email: string;
  password: string;
  is_active: boolean;
  roles: string[];
};

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  lider_social: "Liderança social",
  operador: "Operador",
};

const roleDescriptions: Record<string, string> = {
  admin: "Administra acessos, acompanha auditoria e opera todos os módulos.",
  lider_social: "Gerencia famílias, benefícios, avaliações e relatórios sociais.",
  operador: "Opera estoque, entradas, cestas, agendamentos e entregas.",
};

const roleCapabilities: Record<string, string[]> = {
  admin: [
    "Usuários, perfis e auditoria",
    "Atendimento social e avaliações",
    "Estoque, cestas e entregas",
  ],
  lider_social: [
    "Famílias, pessoas e benefícios",
    "Avaliações e reavaliações",
    "Relatórios autorizados ao perfil",
  ],
  operador: [
    "Produtos, categorias e entradas",
    "Tipos de cesta e disponibilidade",
    "Agendamentos, entregas e rastreabilidade",
  ],
};

function createInitialFormState(): UserFormState {
  return {
    name: "",
    login_name: "",
    email: "",
    password: "",
    is_active: true,
    roles: [],
  };
}

function formatRole(role: string): string {
  return roleLabels[role] ?? role;
}

function formatRoleDescription(role: string, fallback?: string | null): string {
  return roleDescriptions[role] ?? fallback ?? "Permissão operacional do sistema.";
}

function formatLastLogin(value: string | null): string {
  return value ? formatDateTime(value) : "Nunca acessou";
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "CD";
}

function getRoleBadgeClass(role: string): string {
  if (role === "admin") {
    return `${styles.badge} ${styles.badgeAdmin}`;
  }

  if (role === "lider_social") {
    return `${styles.badge} ${styles.badgeSocial}`;
  }

  return `${styles.badge} ${styles.badgeOperator}`;
}

export function UsersPage() {
  const [searchParams] = useSearchParams();
  const activeSection = searchParams.get("view") === "roles" ? "roles" : "users";
  const [users, setUsers] = useState<UserAdminResponse[]>([]);
  const [roles, setRoles] = useState<RoleOptionResponse[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [formData, setFormData] = useState<UserFormState>(createInitialFormState);
  const [passwordReset, setPasswordReset] = useState("");
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [feedback, setFeedback] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setPageError("");

    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        api.get<UserAdminResponse[]>("/users"),
        api.get<RoleOptionResponse[]>("/users/roles"),
      ]);

      setUsers(usersResponse.data);
      setRoles(rolesResponse.data);
    } catch (error) {
      setPageError(getApiErrorMessage(error, "Não foi possível carregar os usuários."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isCurrent = true;

    void Promise.all([
      api.get<UserAdminResponse[]>("/users"),
      api.get<RoleOptionResponse[]>("/users/roles"),
    ])
      .then(([usersResponse, rolesResponse]) => {
        if (!isCurrent) return;
        setUsers(usersResponse.data);
        setRoles(rolesResponse.data);
      })
      .catch((error) => {
        if (isCurrent) {
          setPageError(getApiErrorMessage(error, "Não foi possível carregar os usuários."));
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const editingUser = useMemo(
    () => users.find((user) => user.id === editingUserId) ?? null,
    [editingUserId, users],
  );

  const summary = useMemo(
    () => ({
      total: users.length,
      active: users.filter((user) => user.is_active).length,
      admins: users.filter((user) => user.roles.includes("admin")).length,
      inactive: users.filter((user) => !user.is_active).length,
    }),
    [users],
  );

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");

    return users.filter((user) => {
      const matchesRole = !roleFilter || user.roles.includes(roleFilter);
      const matchesQuery =
        !normalizedQuery ||
        [user.name, user.login_name, user.email, ...user.roles]
          .join(" ")
          .toLocaleLowerCase("pt-BR")
          .includes(normalizedQuery);

      return matchesRole && matchesQuery;
    });
  }, [query, roleFilter, users]);

  const isFormDirty = useMemo(() => {
    if (!isDialogOpen) {
      return false;
    }

    if (!editingUser) {
      return (
        formData.name !== "" ||
        formData.login_name !== "" ||
        formData.email !== "" ||
        formData.password !== "" ||
        !formData.is_active ||
        formData.roles.length > 0
      );
    }

    return (
      formData.name !== editingUser.name ||
      formData.login_name !== editingUser.login_name ||
      formData.email !== editingUser.email ||
      formData.is_active !== editingUser.is_active ||
      [...formData.roles].sort().join("|") !== [...editingUser.roles].sort().join("|") ||
      passwordReset !== ""
    );
  }, [editingUser, formData, isDialogOpen, passwordReset]);

  useUnsavedChangesWarning(isDialogOpen && isFormDirty && !isSubmitting);

  function clearFormState() {
    setEditingUserId(null);
    setPasswordReset("");
    setFormError("");
    setFormData(createInitialFormState());
  }

  function closeDialog() {
    setIsDialogOpen(false);
    clearFormState();
  }

  const requestCloseDialog = useCallback(() => {
    if (isSubmitting || isResettingPassword) {
      return;
    }

    if (confirmDiscardUnsavedChanges(isFormDirty)) {
      setIsDialogOpen(false);
      setEditingUserId(null);
      setPasswordReset("");
      setFormError("");
      setFormData(createInitialFormState());
    }
  }, [isFormDirty, isResettingPassword, isSubmitting]);

  function openCreateDialog() {
    clearFormState();
    setFeedback("");
    setIsDialogOpen(true);
  }

  function openEditDialog(user: UserAdminResponse) {
    setEditingUserId(user.id);
    setPasswordReset("");
    setFormError("");
    setFeedback("");
    setFormData({
      name: user.name,
      login_name: user.login_name,
      email: user.email,
      password: "",
      is_active: user.is_active,
      roles: [...user.roles],
    });
    setIsDialogOpen(true);
  }

  function toggleRole(roleName: string) {
    setFormData((previous) => ({
      ...previous,
      roles: previous.roles.includes(roleName)
        ? previous.roles.filter((role) => role !== roleName)
        : [...previous.roles, roleName],
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!formData.name.trim() || !formData.login_name.trim() || !formData.email.trim()) {
      setFormError("Nome, login e e-mail de recuperação são obrigatórios.");
      return;
    }

    if (formData.roles.length === 0) {
      setFormError("Selecione pelo menos um perfil de acesso.");
      return;
    }

    if (!editingUserId && !isStrongPassword(formData.password)) {
      setFormError(PASSWORD_POLICY_HINT);
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
        setFeedback("Usuário atualizado com segurança.");
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
        setFeedback("Novo usuário cadastrado com segurança.");
      }

      closeDialog();
      await loadData();
    } catch (error) {
      setFormError(getApiErrorMessage(error, "Não foi possível salvar o usuário."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasswordReset() {
    if (!editingUserId) {
      return;
    }

    setFormError("");
    if (!isStrongPassword(passwordReset)) {
      setFormError(PASSWORD_POLICY_HINT);
      return;
    }

    setIsResettingPassword(true);
    try {
      const payload: UserPasswordResetPayload = { new_password: passwordReset.trim() };
      await api.put(`/users/${editingUserId}/password`, payload);
      setPasswordReset("");
      setFeedback("Senha redefinida. O evento foi registrado na auditoria.");
      await loadData();
    } catch (error) {
      setFormError(getApiErrorMessage(error, "Não foi possível redefinir a senha."));
    } finally {
      setIsResettingPassword(false);
    }
  }

  const accessAside = (
    <>
      <h2 className={styles.summaryTitle}>Resumo de acesso</h2>
      <div className={styles.brandSummary}>
        <img src="/logo-symbol.png" alt="" aria-hidden="true" />
        <div>
          <strong>Cesta Digital</strong>
          <span>Controle administrativo ativo</span>
        </div>
      </div>

      <div className={styles.summaryStats} aria-label="Resumo de usuários">
        <div className={styles.summaryStat}><span>Usuários</span><strong>{summary.total}</strong></div>
        <div className={styles.summaryStat}><span>Ativos</span><strong>{summary.active}</strong></div>
        <div className={styles.summaryStat}><span>Admins</span><strong>{summary.admins}</strong></div>
        <div className={styles.summaryStat}><span>Inativos</span><strong>{summary.inactive}</strong></div>
      </div>

      <section className={styles.summarySection}>
        <h3>Proteções vigentes</h3>
        <ul className={styles.summaryList}>
          <li><ShieldCheck aria-hidden="true" /><span>Somente administradores acessam esta área.</span></li>
          <li><UserCheck aria-hidden="true" /><span>O último administrador ativo não pode perder o acesso.</span></li>
          <li><KeyRound aria-hidden="true" /><span>Criação e redefinição exigem senha forte.</span></li>
        </ul>
      </section>
    </>
  );

  return (
    <AdministrationShell activeSection={activeSection} aside={accessAside}>
      {activeSection === "roles" ? (
        <>
          <header className={styles.panelHeader}>
            <div>
              <h2>Perfis de acesso</h2>
              <p>Entenda as responsabilidades reais de cada perfil do sistema.</p>
            </div>
          </header>

          {isLoading ? (
            <div className={styles.loadingState} role="status">Carregando perfis...</div>
          ) : pageError ? (
            <div className={styles.errorState} role="alert">{pageError}</div>
          ) : (
            <div className={styles.rolesGrid}>
              {roles.map((role) => {
                const count = users.filter((user) => user.roles.includes(role.name)).length;
                return (
                  <article className={styles.roleCard} key={role.id}>
                    <div className={styles.roleCardHeader}>
                      <span className={styles.roleIcon}><UserRoundCog aria-hidden="true" /></span>
                      <div>
                        <h3>{formatRole(role.name)}</h3>
                        <span className={getRoleBadgeClass(role.name)}>Perfil do sistema</span>
                      </div>
                    </div>
                    <p>{formatRoleDescription(role.name, role.description)}</p>
                    <ul>
                      {(roleCapabilities[role.name] ?? []).map((capability) => (
                        <li key={capability}>{capability}</li>
                      ))}
                    </ul>
                    <span className={styles.roleCount}>{count} usuário{count === 1 ? "" : "s"} com este perfil</span>
                  </article>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <header className={styles.panelHeader}>
            <div>
              <h2>Usuários</h2>
              <p>Gerencie as pessoas que podem entrar no sistema e seus perfis.</p>
            </div>
            <button type="button" className={styles.primaryButton} onClick={openCreateDialog}>
              <Plus aria-hidden="true" /> Novo usuário
            </button>
          </header>

          <div className={styles.toolbar} role="search">
            <label className={styles.searchControl}>
              <Search aria-hidden="true" />
              <span className="sr-only">Buscar usuário</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nome, login ou e-mail"
              />
            </label>
            <label>
              <span className="sr-only">Filtrar por perfil</span>
              <select
                className={styles.selectControl}
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
              >
                <option value="">Todos os perfis</option>
                {roles.map((role) => <option key={role.id} value={role.name}>{formatRole(role.name)}</option>)}
              </select>
            </label>
          </div>

          {feedback ? <p className={styles.formSuccess} role="status">{feedback}</p> : null}
          {pageError ? <p className={styles.formError} role="alert">{pageError}</p> : null}

          {isLoading ? (
            <div className={styles.loadingState} role="status">Carregando usuários...</div>
          ) : filteredUsers.length === 0 ? (
            <div className={styles.emptyState} role="status">Nenhum usuário corresponde aos filtros atuais.</div>
          ) : (
            <>
              <div className={styles.tableShell}>
                <div className={styles.tableScroll}>
                  <table className={`${styles.table} ${styles.usersTable}`}>
                    <caption className="sr-only">Usuários e perfis cadastrados</caption>
                    <thead>
                      <tr><th>Usuário</th><th>E-mail</th><th>Perfil</th><th>Status</th><th>Último acesso</th><th>Ação</th></tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id}>
                          <td>
                            <div className={styles.userCell}>
                              <span className={styles.avatar}>{getInitials(user.name)}</span>
                              <span><strong>{user.name}</strong><span>@{user.login_name}</span></span>
                            </div>
                          </td>
                          <td className={styles.truncate} title={user.email}>{user.email}</td>
                          <td><div className={styles.badgeList}>{user.roles.map((role) => <span key={`${user.id}-${role}`} className={getRoleBadgeClass(role)}>{formatRole(role)}</span>)}</div></td>
                          <td><span className={`${styles.status} ${user.is_active ? styles.statusActive : styles.statusInactive}`}>{user.is_active ? "Ativo" : "Inativo"}</span></td>
                          <td>{formatLastLogin(user.last_login_at)}</td>
                          <td>
                            <button type="button" className={styles.rowAction} onClick={() => openEditDialog(user)} aria-label={`Editar ${user.name}`}>
                              <Pencil aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className={styles.mobileList}>
                  {filteredUsers.map((user) => (
                    <article className={styles.mobileCard} key={`mobile-${user.id}`}>
                      <div className={styles.mobileCardHeader}>
                        <div className={styles.userCell}>
                          <span className={styles.avatar}>{getInitials(user.name)}</span>
                          <span><strong>{user.name}</strong><span>@{user.login_name}</span></span>
                        </div>
                        <span className={`${styles.status} ${user.is_active ? styles.statusActive : styles.statusInactive}`}>{user.is_active ? "Ativo" : "Inativo"}</span>
                      </div>
                      <dl className={styles.mobileCardMeta}>
                        <div><dt>E-mail</dt><dd>{user.email}</dd></div>
                        <div><dt>Último acesso</dt><dd>{formatLastLogin(user.last_login_at)}</dd></div>
                      </dl>
                      <div className={styles.mobileCardFooter}>
                        <div className={styles.badgeList}>{user.roles.map((role) => <span key={`mobile-${user.id}-${role}`} className={getRoleBadgeClass(role)}>{formatRole(role)}</span>)}</div>
                        <button type="button" className={styles.secondaryButton} onClick={() => openEditDialog(user)}><Pencil aria-hidden="true" /> Editar</button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
              <div className={styles.pagination}><span>Mostrando {filteredUsers.length} de {users.length} usuários</span></div>
            </>
          )}
        </>
      )}

      {isDialogOpen ? (
        <AdministrationDialog
          title={editingUser ? "Editar usuário" : "Novo usuário"}
          description={editingUser ? "Atualize identificação, status e perfis de acesso." : "Crie um acesso individual com senha inicial segura."}
          onRequestClose={requestCloseDialog}
          footer={
            <>
              <button type="button" className={styles.secondaryButton} onClick={requestCloseDialog}>Cancelar</button>
              <button type="submit" form="administration-user-form" className={styles.primaryButton} disabled={isSubmitting}>{isSubmitting ? "Salvando..." : editingUser ? "Salvar alterações" : "Cadastrar usuário"}</button>
            </>
          }
        >
          <form id="administration-user-form" onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              <label className={styles.field}>Nome completo<input value={formData.name} onChange={(event) => setFormData((previous) => ({ ...previous, name: event.target.value }))} autoComplete="name" required /></label>
              <label className={styles.field}>Login de acesso<input value={formData.login_name} onChange={(event) => setFormData((previous) => ({ ...previous, login_name: event.target.value }))} autoComplete="username" pattern="[a-zA-Z0-9._-]{3,80}" spellCheck={false} required /></label>
              <label className={`${styles.field} ${styles.fullField}`}>E-mail de recuperação<input type="email" value={formData.email} onChange={(event) => setFormData((previous) => ({ ...previous, email: event.target.value }))} autoComplete="email" required /></label>
              {!editingUser ? <label className={`${styles.field} ${styles.fullField}`}>Senha inicial<input type="password" value={formData.password} onChange={(event) => setFormData((previous) => ({ ...previous, password: event.target.value }))} autoComplete="new-password" required /></label> : null}
            </div>

            {!editingUser ? <p className={styles.formHint}>{PASSWORD_POLICY_HINT}</p> : null}

            <section className={styles.permissionBlock}>
              <div><h3>Perfis de acesso</h3><p>Selecione somente as responsabilidades necessárias para esta pessoa.</p></div>
              <div className={styles.roleChoices}>
                {roles.map((role) => (
                  <label className={styles.checkCard} key={role.id}>
                    <input type="checkbox" checked={formData.roles.includes(role.name)} onChange={() => toggleRole(role.name)} />
                    <span><strong>{formatRole(role.name)}</strong><small>{formatRoleDescription(role.name, role.description)}</small></span>
                  </label>
                ))}
              </div>
              <label className={styles.checkCard}>
                <input type="checkbox" checked={formData.is_active} onChange={(event) => setFormData((previous) => ({ ...previous, is_active: event.target.checked }))} />
                <span><strong>Usuário ativo</strong><small>Permite autenticação enquanto este status estiver ativo.</small></span>
              </label>
            </section>

            {editingUser ? (
              <section className={styles.passwordBlock}>
                <div><h3>Redefinir senha</h3><p>{PASSWORD_POLICY_HINT}</p></div>
                <div className={styles.inlineForm}>
                  <label className="sr-only" htmlFor="administration-password-reset">Nova senha</label>
                  <input id="administration-password-reset" className={styles.dateControl} type="password" value={passwordReset} onChange={(event) => { setPasswordReset(event.target.value); setFeedback(""); }} placeholder="Nova senha forte" autoComplete="new-password" />
                  <button type="button" className={styles.secondaryButton} onClick={() => void handlePasswordReset()} disabled={isResettingPassword}>{isResettingPassword ? "Redefinindo..." : "Redefinir senha"}</button>
                </div>
              </section>
            ) : null}

            {editingUser && feedback ? <p className={styles.formSuccess} role="status">{feedback}</p> : null}
            {formError ? <p className={styles.formError} role="alert">{formError}</p> : null}
          </form>
        </AdministrationDialog>
      ) : null}
    </AdministrationShell>
  );
}
