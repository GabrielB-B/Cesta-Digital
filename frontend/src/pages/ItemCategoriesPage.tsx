import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { ItemCategoryResponse } from "../types/item";

/**
 * Cadastro e consulta de categorias de item.
 */
export function ItemCategoriesPage() {
  const [categories, setCategories] = useState<ItemCategoryResponse[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function loadCategories() {
    try {
      setIsLoading(true);
      setError("");
      const response = await api.get<ItemCategoryResponse[]>("/item-categories");
      setCategories(response.data);
    } catch {
      setError("Não foi possível carregar as categorias.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCategories();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Informe o nome da categoria.");
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post<ItemCategoryResponse>("/item-categories", {
        name: name.trim(),
        description: description.trim() || null,
      });

      setName("");
      setDescription("");
      await loadCategories();
    } catch {
      setError("Não foi possível cadastrar a categoria.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Catálogo</p>
          <h2>Categorias de item</h2>
          <p className="hero-card__description">
            Organize os itens do estoque por grupos para manter cadastros,
            relatórios e consultas consistentes.
          </p>
        </div>
      </section>

      <section className="content-grid">
        <form onSubmit={handleSubmit} className="panel-card form-panel">
          <div className="panel-card__header">
            <div>
              <p className="eyebrow">Novo cadastro</p>
              <h3>Nova categoria</h3>
            </div>
          </div>

          <div className="form-grid">
            <label className="form__group">
              <span>Nome</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex.: alimentos"
                required
              />
            </label>

            <label className="form__group form__group--wide">
              <span>Descrição</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder="Descreva o uso desta categoria"
              />
            </label>
          </div>

          {error ? <p className="status-error">{error}</p> : null}

          <div className="panel-actions">
            <button type="submit" className="button" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Cadastrar categoria"}
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
                      {category.description || "Sem descrição"}
                    </p>
                  </div>

                  <span className="pill">#{category.id}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
