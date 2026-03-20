import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type {
  ItemCategoryResponse,
  ItemCreatePayload,
  ItemDetailResponse,
} from "../types/item";

/**
 * Cadastro operacional de item no catálogo.
 */
export function ItemCreatePage() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState<ItemCategoryResponse[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    category_id: "",
    name: "",
    unit_measure: "unidade",
    tracks_expiration: true,
    is_active: true,
    reference_unit_value: 0,
    minimum_stock_alert: 0,
    notes: "",
  });

  useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      try {
        setIsLoadingCategories(true);
        const response = await api.get<ItemCategoryResponse[]>("/item-categories");

        if (isMounted) {
          setCategories(response.data);
        }
      } catch {
        if (isMounted) {
          setError("Não foi possível carregar as categorias de item.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingCategories(false);
        }
      }
    }

    void loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  function handleInputChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value, type } = event.target as HTMLInputElement;

    if (type === "checkbox") {
      setFormData((previous) => ({
        ...previous,
        [name]: (event.target as HTMLInputElement).checked,
      }));
      return;
    }

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!formData.category_id) {
      setError("Selecione uma categoria.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: ItemCreatePayload = {
        category_id: Number(formData.category_id),
        name: formData.name.trim(),
        unit_measure: formData.unit_measure,
        tracks_expiration: formData.tracks_expiration,
        is_active: formData.is_active,
        reference_unit_value: Number(formData.reference_unit_value),
        minimum_stock_alert: Number(formData.minimum_stock_alert),
        notes: formData.notes.trim() || null,
      };

      const response = await api.post<ItemDetailResponse>("/items", payload);
      navigate(`/items/${response.data.id}`);
    } catch {
      setError("Não foi possível cadastrar o item.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Novo item</p>
          <h2>Cadastrar item</h2>
          <p className="hero-card__description">
            Crie um novo item no catálogo do estoque para uso em lotes,
            movimentações e montagem de cestas.
          </p>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="panel-card form-panel">
        <div className="panel-card__header">
          <div>
            <p className="eyebrow">Catálogo</p>
            <h3>Dados principais do item</h3>
          </div>
        </div>

        <div className="form-grid">
          <label className="form__group">
            <span>Categoria</span>
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleInputChange}
              disabled={isLoadingCategories}
              required
            >
              <option value="">Selecione</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="form__group">
            <span>Nome do item</span>
            <input
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Ex.: Óleo 900ml"
              required
            />
          </label>

          <label className="form__group">
            <span>Unidade de medida</span>
            <select
              name="unit_measure"
              value={formData.unit_measure}
              onChange={handleInputChange}
            >
              <option value="unidade">unidade</option>
              <option value="pacote">pacote</option>
              <option value="kg">kg</option>
              <option value="litro">litro</option>
              <option value="caixa">caixa</option>
              <option value="frasco">frasco</option>
            </select>
          </label>

          <label className="form__group">
            <span>Valor de referência</span>
            <input
              type="number"
              min="0"
              step="0.01"
              name="reference_unit_value"
              value={formData.reference_unit_value}
              onChange={handleInputChange}
            />
          </label>

          <label className="form__group">
            <span>Alerta mínimo</span>
            <input
              type="number"
              min="0"
              name="minimum_stock_alert"
              value={formData.minimum_stock_alert}
              onChange={handleInputChange}
            />
          </label>

          <label className="checkbox-card">
            <input
              type="checkbox"
              name="tracks_expiration"
              checked={formData.tracks_expiration}
              onChange={handleInputChange}
            />
            <span>Controla validade</span>
          </label>

          <label className="checkbox-card">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleInputChange}
            />
            <span>Item ativo</span>
          </label>

          <label className="form__group form__group--wide">
            <span>Observações</span>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={4}
            />
          </label>
        </div>

        {error ? <p className="status-error">{error}</p> : null}

        <div className="panel-actions">
          <Link to="/items" className="button button--secondary button--link">
            Cancelar
          </Link>

          <button type="submit" className="button" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Cadastrar item"}
          </button>
        </div>
      </form>
    </div>
  );
}