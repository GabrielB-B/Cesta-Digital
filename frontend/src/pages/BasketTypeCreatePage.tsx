import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { BasketTypeCreatePayload, BasketTypeResponse } from "../types/basket";
import { getApiErrorMessage } from "../utils/api-error";

/**
 * Cadastro de tipo de cesta.
 */
export function BasketTypeCreatePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Informe o nome do tipo de cesta.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: BasketTypeCreatePayload = {
        name: name.trim(),
        is_active: isActive,
        notes: notes.trim() || null,
      };

      const response = await api.post<BasketTypeResponse>("/basket-types", payload);
      navigate(`/basket-types/${response.data.id}`, {
        state: {
          flash: {
            type: "success",
            message: "Tipo de cesta cadastrado com sucesso.",
          },
        },
      });
    } catch (err) {
      setError(
        getApiErrorMessage(err, "Não foi possível cadastrar o tipo de cesta.")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Cestas</p>
          <h2>Novo tipo de cesta</h2>
          <p className="hero-card__description">
            Crie um modelo de cesta para depois montar a receita com os itens do
            estoque.
          </p>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="panel-card form-panel">
        <div className="panel-card__header">
          <div>
            <p className="eyebrow">Cadastro</p>
            <h3>Dados do tipo de cesta</h3>
          </div>
        </div>

        <div className="form-grid">
          <label className="form__group">
            <span>Nome</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: cesta padrão mensal"
              required
            />
          </label>

          <label className="checkbox-card">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            <span>Tipo ativo para operação</span>
          </label>

          <label className="form__group form__group--wide">
            <span>Observações</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
            />
          </label>
        </div>

        {error ? (
          <p className="status-error" role="alert" aria-live="polite">
            {error}
          </p>
        ) : null}

        <div className="panel-actions panel-actions--spread">
          <Link
            to="/basket-types"
            className="button button--secondary button--link"
          >
            Cancelar
          </Link>

          <button type="submit" className="button" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Cadastrar tipo"}
          </button>
        </div>
      </form>
    </div>
  );
}
