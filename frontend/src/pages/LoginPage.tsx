import axios from "axios";
import { useEffect, useRef, useState } from "react";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { EnvironmentNotice } from "../components/EnvironmentNotice";
import { useAuth } from "../contexts/useAuth";
import { getApiErrorMessage } from "../utils/api-error";
import styles from "./LoginPage.module.css";

interface ValidationIssue {
  loc?: Array<string | number>;
  msg?: string;
}

function normalizeLoginError(detail: unknown) {
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail)) {
    const issues = detail as ValidationIssue[];
    const missingFields = issues
      .filter((issue) => issue.msg === "Field required")
      .map((issue) => {
        const field = issue.loc ? issue.loc[issue.loc.length - 1] : undefined;

        if (field === "username") {
          return "nome de login";
        }

        if (field === "password") {
          return "senha";
        }

        return null;
      })
      .filter((field): field is "nome de login" | "senha" => field !== null);

    if (missingFields.length === 2) {
      return "Informe nome de login e senha para entrar.";
    }

    if (missingFields.length === 1) {
      return `Informe ${missingFields[0]} para entrar.`;
    }
  }

  return "";
}

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const recoveryEmailRef = useRef<HTMLInputElement>(null);

  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [recoveryError, setRecoveryError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [isRecoverySubmitting, setIsRecoverySubmitting] = useState(false);

  useEffect(() => {
    if (isRecoveryOpen) {
      recoveryEmailRef.current?.focus();
    }
  }, [isRecoveryOpen]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError("");

    const normalizedLoginName = loginName.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedLoginName && !normalizedPassword) {
      setError("Informe nome de login e senha para entrar.");
      return;
    }

    if (!normalizedLoginName) {
      setError("Informe o nome de login para entrar.");
      return;
    }

    if (!normalizedPassword) {
      setError("Informe a senha para entrar.");
      return;
    }

    setIsSubmitting(true);

    try {
      await login(normalizedLoginName, normalizedPassword);
      navigate("/", { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const backendDetail = err.response?.data?.detail;
        const normalizedError = normalizeLoginError(backendDetail);

        if (normalizedError) {
          setError(normalizedError);
        } else {
          setError(getApiErrorMessage(err, "Erro inesperado ao tentar entrar."));
        }
      } else {
        setError("Erro inesperado ao tentar entrar.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRecoverySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRecoveryMessage("");
    setRecoveryError("");

    const normalizedEmail = recoveryEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      setRecoveryError("Informe o e-mail de recuperação cadastrado.");
      return;
    }

    setIsRecoverySubmitting(true);

    try {
      const response = await api.post<{ message: string }>("/auth/password-recovery", {
        email: normalizedEmail,
      });
      setRecoveryMessage(response.data.message);
    } catch (err) {
      setRecoveryError(
        getApiErrorMessage(err, "Não foi possível solicitar a recuperação."),
      );
    } finally {
      setIsRecoverySubmitting(false);
    }
  }

  function toggleRecovery() {
    setIsRecoveryOpen((current) => !current);
    setRecoveryError("");
    setRecoveryMessage("");
  }

  return (
    <main className={styles.page}>
      <section className={styles.brandPanel} aria-label="Apresentação Cesta Digital">
        <div className={styles.brandContent}>
          <div className={styles.brandLockup}>
            <img
              className={styles.brandSymbol}
              src="/logo-symbol.png"
              width="256"
              height="256"
              alt="Símbolo da Cesta Digital"
              decoding="async"
              draggable={false}
            />
            <p className={styles.brandName} translate="no">
              <span>Cesta</span>
              <span>Digital</span>
            </p>
          </div>

          <div className={styles.brandStatement}>
            <span className={styles.brandRule} aria-hidden="true" />
            <p>
              Gestão de doações que
              <strong> transformam vidas.</strong>
            </p>
          </div>
        </div>

        <svg
          className={styles.brandWaves}
          viewBox="0 0 700 230"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M-20 132C96 49 193 63 287 130C389 204 496 207 720 59" />
          <path d="M-20 148C96 65 193 79 287 146C389 220 496 223 720 75" />
          <path d="M-20 164C96 81 193 95 287 162C389 236 496 239 720 91" />
          <path d="M-20 180C96 97 193 111 287 178C389 252 496 255 720 107" />
          <path d="M-20 196C96 113 193 127 287 194C389 268 496 271 720 123" />
        </svg>
      </section>

      <section className={styles.accessPanel} aria-label="Acesso ao Cesta Digital">
        <div className={styles.accessContent}>
          <section
            className={styles.loginCard}
            aria-labelledby="login-title"
            aria-busy={isSubmitting}
          >
            <EnvironmentNotice compact className={styles.environmentNotice} />

            <header className={styles.heading}>
              <h1 id="login-title">Bem-vindo de volta!</h1>
              <p>Acesse sua conta para continuar</p>
            </header>

            <form onSubmit={handleSubmit} className={styles.form} noValidate>
              <div className={styles.field}>
                <label htmlFor="login-name">Nome de login</label>
                <div className={styles.inputShell}>
                  <UserRound size={23} strokeWidth={1.8} aria-hidden="true" />
                  <input
                    id="login-name"
                    type="text"
                    name="login_name"
                    value={loginName}
                    onChange={(event) => {
                      setLoginName(event.target.value);
                      if (error) {
                        setError("");
                      }
                    }}
                    placeholder="Digite seu nome de login"
                    autoComplete="username"
                    pattern="[a-z0-9._-]{3,80}"
                    spellCheck={false}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "login-error" : undefined}
                    required
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="login-password">Senha</label>
                <div className={styles.inputShell}>
                  <LockKeyhole size={23} strokeWidth={1.8} aria-hidden="true" />
                  <input
                    id="login-password"
                    type={isPasswordVisible ? "text" : "password"}
                    name="password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (error) {
                        setError("");
                      }
                    }}
                    placeholder="Digite sua senha"
                    autoComplete="current-password"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "login-error" : undefined}
                    required
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setIsPasswordVisible((current) => !current)}
                    aria-label={isPasswordVisible ? "Ocultar senha" : "Mostrar senha"}
                    aria-pressed={isPasswordVisible}
                  >
                    {isPasswordVisible ? (
                      <EyeOff size={22} strokeWidth={1.8} aria-hidden="true" />
                    ) : (
                      <Eye size={22} strokeWidth={1.8} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <div className={styles.formUtilities}>
                <span>Acesso seguro para equipe autorizada</span>
                <button
                  type="button"
                  className={styles.forgotButton}
                  onClick={toggleRecovery}
                  aria-expanded={isRecoveryOpen}
                  aria-controls="password-recovery-panel"
                >
                  Esqueci minha senha
                </button>
              </div>

              {error ? (
                <p id="login-error" className={styles.errorMessage} role="alert" aria-live="polite">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                className={styles.submitButton}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Entrando…" : "Entrar"}
              </button>
            </form>

            {isRecoveryOpen ? (
              <form
                id="password-recovery-panel"
                className={styles.recoveryPanel}
                onSubmit={handleRecoverySubmit}
                aria-label="Solicitar recuperação de senha"
              >
                <div className={styles.recoveryHeading}>
                  <ShieldCheck size={21} strokeWidth={1.8} aria-hidden="true" />
                  <div>
                    <strong>Recuperar acesso</strong>
                    <p>Informe o e-mail cadastrado para solicitar a redefinição.</p>
                  </div>
                </div>

                <div className={styles.field}>
                  <label htmlFor="recovery-email">E-mail de recuperação</label>
                  <div className={styles.inputShell}>
                    <Mail size={22} strokeWidth={1.8} aria-hidden="true" />
                    <input
                      ref={recoveryEmailRef}
                      id="recovery-email"
                      type="email"
                      name="recovery_email"
                      value={recoveryEmail}
                      onChange={(event) => {
                        setRecoveryEmail(event.target.value);
                        setRecoveryError("");
                        setRecoveryMessage("");
                      }}
                      placeholder="seu@email.com"
                      autoComplete="email"
                      aria-invalid={Boolean(recoveryError)}
                      aria-describedby={recoveryError ? "recovery-error" : undefined}
                      required
                    />
                  </div>
                </div>

                {recoveryError ? (
                  <p
                    id="recovery-error"
                    className={styles.errorMessage}
                    role="alert"
                    aria-live="polite"
                  >
                    {recoveryError}
                  </p>
                ) : null}

                {recoveryMessage ? (
                  <p className={styles.successMessage} role="status" aria-live="polite">
                    {recoveryMessage}
                  </p>
                ) : null}

                <button
                  type="submit"
                  className={styles.recoveryButton}
                  disabled={isRecoverySubmitting}
                >
                  {isRecoverySubmitting ? "Enviando…" : "Solicitar recuperação"}
                </button>
              </form>
            ) : null}
          </section>

          <p className={styles.accessFootnote}>Gestão de doações com segurança e responsabilidade.</p>
        </div>
      </section>
    </main>
  );
}
