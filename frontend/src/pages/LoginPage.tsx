import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { LogIn, Mail, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { BrandLockup } from "../components/BrandLockup";
import {
  LOGIN_SUCCESS_SPLASH_REDUCED_TIMEOUT_MS,
  LOGIN_SUCCESS_SPLASH_TIMEOUT_MS,
  LoginSuccessOverlay,
} from "../components/LoginSuccessOverlay";
import { useAuth } from "../contexts/useAuth";
import { getApiErrorMessage } from "../utils/api-error";

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

function getLoginSuccessSplashDuration() {
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return LOGIN_SUCCESS_SPLASH_REDUCED_TIMEOUT_MS;
  }

  return LOGIN_SUCCESS_SPLASH_TIMEOUT_MS;
}

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [recoveryError, setRecoveryError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessSplashVisible, setIsSuccessSplashVisible] = useState(false);
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [isRecoverySubmitting, setIsRecoverySubmitting] = useState(false);
  const loginRevealTimeoutRef = useRef<number | null>(null);
  const loginRevealResolveRef = useRef<(() => void) | null>(null);

  const resolveLoginReveal = useCallback(() => {
    if (loginRevealTimeoutRef.current !== null) {
      window.clearTimeout(loginRevealTimeoutRef.current);
      loginRevealTimeoutRef.current = null;
    }

    if (loginRevealResolveRef.current !== null) {
      const resolve = loginRevealResolveRef.current;
      loginRevealResolveRef.current = null;
      resolve();
    }
  }, []);

  useEffect(() => {
    return () => {
      if (loginRevealTimeoutRef.current !== null) {
        window.clearTimeout(loginRevealTimeoutRef.current);
        loginRevealTimeoutRef.current = null;
      }
      loginRevealResolveRef.current = null;
    };
  }, []);

  function waitForLoginReveal(durationMs: number) {
    if (loginRevealTimeoutRef.current !== null) {
      window.clearTimeout(loginRevealTimeoutRef.current);
      loginRevealTimeoutRef.current = null;
    }

    if (loginRevealResolveRef.current !== null) {
      loginRevealResolveRef.current();
      loginRevealResolveRef.current = null;
    }

    return new Promise<void>((resolve) => {
      loginRevealResolveRef.current = resolve;
      loginRevealTimeoutRef.current = window.setTimeout(() => {
        resolveLoginReveal();
      }, durationMs);
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting || isSuccessSplashVisible) {
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
    setIsSuccessSplashVisible(false);

    try {
      await login(normalizedLoginName, normalizedPassword);
      setIsSuccessSplashVisible(true);
      await waitForLoginReveal(getLoginSuccessSplashDuration());
      navigate("/", { replace: true });
    } catch (err) {
      setIsSuccessSplashVisible(false);

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
      setRecoveryError("Informe o email de recuperacao cadastrado.");
      return;
    }

    setIsRecoverySubmitting(true);

    try {
      const response = await api.post<{ message: string }>("/auth/password-recovery", {
        email: normalizedEmail,
      });
      setRecoveryMessage(response.data.message);
    } catch (err) {
      setRecoveryError(getApiErrorMessage(err, "Nao foi possivel solicitar a recuperacao."));
    } finally {
      setIsRecoverySubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div
        className={`login-shell${isSubmitting ? " login-shell--submitting" : ""}`}
        aria-busy={isSubmitting || isSuccessSplashVisible}
      >
        <aside className="login-brand-panel" aria-label="Cesta Digital">
          <BrandLockup
            variant="login"
            title="Cesta Digital"
            subtitle="Gestao social, estoque e entregas em um so lugar."
          />
        </aside>

        <section className="login-card" aria-label="Entrar no Cesta Digital">
          <div className="login-card__brand" aria-label="Cesta Digital">
            <BrandLockup
              variant="login"
              title="Cesta Digital"
              subtitle="Gestao social, estoque e entregas em um so lugar."
            />
          </div>

          <div className="login-card__heading">
            <p className="eyebrow">Acesso seguro</p>
            <h1>Entrar no sistema</h1>
            <p>Use seu nome de login para acessar a operacao.</p>
          </div>

          <form onSubmit={handleSubmit} className="form login-form">
            <div className="form__group">
              <label htmlFor="login-name">Nome de login</label>
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
                placeholder="Ex.: admin"
                autoComplete="username"
                pattern="[a-z0-9._-]{3,80}"
                spellCheck={false}
                required
              />
            </div>

            <div className="form__group form__group--password">
              <div className="login-form__label-row">
                <label htmlFor="login-password">Senha</label>
                <button
                  type="button"
                  className="login-card__forgot"
                  onClick={() => {
                    setIsRecoveryOpen((current) => !current);
                    setRecoveryError("");
                    setRecoveryMessage("");
                  }}
                >
                  Esqueci minha senha
                </button>
              </div>
              <input
                id="login-password"
                type="password"
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
                required
              />
            </div>

            {error ? (
              <p className="form__error" role="alert" aria-live="polite">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              className="button login-card__submit"
              disabled={isSubmitting || isSuccessSplashVisible}
            >
              <LogIn size={18} aria-hidden="true" />
              {isSubmitting || isSuccessSplashVisible ? "Entrando..." : "Entrar"}
            </button>
          </form>

          {isRecoveryOpen ? (
            <form
              className="login-card__recovery"
              onSubmit={handleRecoverySubmit}
              aria-label="Solicitar recuperacao de senha"
            >
              <div className="login-card__recovery-heading">
                <ShieldCheck size={18} aria-hidden="true" />
                <div>
                  <strong>Recuperar acesso</strong>
                  <p>Informe o email cadastrado para a equipe redefinir sua senha.</p>
                </div>
              </div>

              <div className="form__group">
                <label htmlFor="recovery-email">Email de recuperacao</label>
                <input
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
                  required
                />
              </div>

              {recoveryError ? (
                <p className="form__error" role="alert" aria-live="polite">
                  {recoveryError}
                </p>
              ) : null}

              {recoveryMessage ? (
                <p className="status-success" role="status" aria-live="polite">
                  {recoveryMessage}
                </p>
              ) : null}

              <button
                type="submit"
                className="button button--secondary login-card__recovery-button"
                disabled={isRecoverySubmitting}
              >
                <Mail size={17} aria-hidden="true" />
                {isRecoverySubmitting ? "Enviando..." : "Solicitar recuperacao"}
              </button>
            </form>
          ) : null}
        </section>

      </div>

      {isSuccessSplashVisible ? <LoginSuccessOverlay onComplete={resolveLoginReveal} /> : null}
    </div>
  );
}
