import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BrandLockup } from "../components/BrandLockup";
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
          return "email";
        }

        if (field === "password") {
          return "senha";
        }

        return null;
      })
      .filter((field): field is "email" | "senha" => field !== null);

    if (missingFields.length === 2) {
      return "Informe email e senha para entrar.";
    }

    if (missingFields.length === 1) {
      return `Informe ${missingFields[0]} para entrar.`;
    }
  }

  return "";
}

/**
 * Tela inicial de autenticação.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim();
    const normalizedPassword = password.trim();

    if (!normalizedEmail && !normalizedPassword) {
      setError("Informe email e senha para entrar.");
      return;
    }

    if (!normalizedEmail) {
      setError("Informe o email para entrar.");
      return;
    }

    if (!normalizedPassword) {
      setError("Informe a senha para entrar.");
      return;
    }

    setIsSubmitting(true);

    try {
      await login(normalizedEmail, normalizedPassword);
      navigate("/");
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

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card__brand">
          <BrandLockup
            variant="login"
            eyebrow="Plataforma oficial"
            subtitle="Acesso centralizado para atendimento social, estoque e entregas."
          />
        </div>

        <div className="login-card__intro">
          <p className="login-card__lead">
            Entre com suas credenciais para continuar.
          </p>
          <p className="login-card__support">
            Use o email cadastrado no sistema e confira se o backend está ativo.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="form">
          <label className="form__group">
            <span>Email</span>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (error) {
                  setError("");
                }
              }}
              placeholder="Digite seu email"
              autoComplete="email"
              spellCheck={false}
              required
            />
          </label>

          <label className="form__group">
            <span>Senha</span>
            <input
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
          </label>

          {error ? (
            <p className="form__error" role="alert" aria-live="polite">
              {error}
            </p>
          ) : null}

          <button type="submit" className="button" disabled={isSubmitting}>
            {isSubmitting ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
