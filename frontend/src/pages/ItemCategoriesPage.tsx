import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { ItemCategoryPayload, ItemCategoryResponse } from "../types/item";
import { getApiErrorMessage } from "../utils/api-error";

export function ItemCategoriesPage() {
  const [categories, setCategories] = useState<ItemCategoryResponse[]>([]);
  const [formData, setFormData] = useState({
    id: null as number | null,
    name: "",
    description: "",
    is_active: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadCategories() {
    try {
      setIsLoading(true);
      setError("");
      const response = await api.get<ItemCategoryResponse[]>("/item-categories");
      setCategories(response.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Nao foi possivel carregar as categorias."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCategories();
  }, []);

  function resetForm() {
    setFormData({
      id: null,
      name: "",
      description: "",
      is_active: true,
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!formData.name.trim()) {
      setError("Informe o nome da categoria.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: ItemCategoryPayload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        is_active: formData.is_active,
      };

      if (formData.id) {
        await api.put<ItemCategoryResponse>(
          `/item-categories/${formData.id}`,
          payload
        );
        setSuccessMessage("Categoria atualizada com auditoria registrada.");
      } else {
        await api.post<ItemCategoryResponse>("/item-categories", payload);
        setSuccessMessage("Categoria cadastrada.");
      }

      resetForm();
      await loadCategories();
    } catch (err) {
      setError(getApiErrorMessage(err, "Nao foi possivel salvar a categoria."));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleEdit(category: ItemCategoryResponse) {
    setError("");
    setSuccessMessage("");
    setFormData({
      id: category.id,
      name: category.name,
      description: category.description ?? "",
      is_active: category.is_active,
    });
  }

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Catalogo</p>
          <h2>Categorias de item</h2>
          <p className="hero-card__description">
            Organize categorias, edite nomes e inative grupos sem perder
            historico operacional.
          </p>
        </div>
      </section>

      <section className="content-grid">
        <form onSubmit={handleSubmit} className="panel-card form-panel">
          <div className="panel-card__header">
            <div>
              <p className="eyebrow">
                {formData.id ? "Edicao" : "Novo cadastro"}
              </p>
              <h3>{formData.id ? "Editar categoria" : "Nova categoria"}</h3>
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
                placeholder="Ex.: alimentos"
                required
              />
            </label>

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
              Categoria ativa
            </label>

            <label className="form__group form__group--wide">
              <span>Descricao</span>
              <textarea
                value={formData.description}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    description: event.target.value,
                  }))
                }
                rows={4}
                placeholder="Descreva o uso desta categoria"
              />
            </label>
          </div>

          {error ? (
            <p className="status-error" role="alert" aria-live="polite">
              {error}
            </p>
          ) : null}
          {successMessage ? (
            <p className="status-success" role="status" aria-live="polite">
              {successMessage}
            </p>
          ) : null}

          <div className="panel-actions">
            {formData.id ? (
              <button
                type="button"
                className="button button--secondary"
                onClick={resetForm}
                disabled={isSubmitting}
              >
                Cancelar edicao
              </button>
            ) : null}

            <button type="submit" className="button" disabled={isSubmitting}>
              {isSubmitting
                ? "Salvando..."
                : formData.id
                  ? "Salvar categoria"
                  : "Cadastrar categoria"}
            </button>
          </div>
        </form>

        <section className="panel-card">
          <div className="panel-card__header">
            <div>
              <p className="eyebrow">Consulta</p>
              <h3>Categorias cadastradas</h3>
            </div>
          </div>

          {isLoading ? (
            <p className="empty-state">Carregando categorias...</p>
          ) : categories.length === 0 ? (
            <p className="empty-state">Nenhuma categoria cadastrada ainda.</p>
          ) : (
            <div className="stack-list">
              {categories.map((category) => (
                <div key={category.id} className="stack-item">
                  <div>
                    <strong>{category.name}</strong>
                    <p className="stack-item__muted">
                      {category.description || "Sem descricao"}
                    </p>
                  </div>

                  <div className="stack-item__actions">
                    {category.is_active ? (
                      <span className="pill pill--success">Ativa</span>
                    ) : (
                      <span className="pill">Inativa</span>
                    )}
                    <button
                      type="button"
                      className="button button--secondary button--small"
                      onClick={() => handleEdit(category)}
                    >
                      Editar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
