import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * Tela inicial de autenticação.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("admin@cestadigital.app");
  const [password, setPassword] = useState("Admin@123456");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      console.error("Erro real do login:", err);

      if (axios.isAxiosError(err)) {
        const backendDetail = err.response?.data?.detail;

        if (typeof backendDetail === "string") {
          setError(backendDetail);
        } else if (Array.isArray(backendDetail)) {
          setError(JSON.stringify(backendDetail));
        } else if (err.response?.status) {
          setError(`Erro ${err.response.status} ao autenticar.`);
        } else {
          setError("Não foi possível conectar ao backend.");
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
        <h1>Cesta Digital</h1>
        <p>Entre para acessar o sistema da UPG.</p>

        <form onSubmit={handleSubmit} className="form">
          <label className="form__group">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Digite seu email"
            />
          </label>

          <label className="form__group">
            <span>Senha</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Digite sua senha"
            />
          </label>

          {error ? <p className="form__error">{error}</p> : null}

          <button type="submit" className="button" disabled={isSubmitting}>
            {isSubmitting ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}