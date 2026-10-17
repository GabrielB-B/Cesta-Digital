import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, PackagePlus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import {
  ProductImagePicker,
  type ProductImageSelection,
} from "../components/ProductImagePicker";
import type {
  ItemCategoryResponse,
  ItemCreatePayload,
} from "../types/item";
import { getApiErrorMessage } from "../utils/api-error";
import { persistProductImageSelection } from "../utils/product-image";
import styles from "./ItemCreatePage.module.css";

/** Cadastro operacional de produto no catálogo. */
export function ItemCreatePage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<ItemCategoryResponse[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState("");
  const [imageSelection, setImageSelection] = useState<ProductImageSelection>({
    kind: "unchanged",
  });
  const [formData, setFormData] = useState({
    category_id: "",
    name: "",
    barcode: "",
    unit_measure: "unidade",
    tracks_expiration: true,
    is_active: true,
    reference_unit_value: 0,
    minimum_stock_alert: 0,
    notes: "",
  });

  const activeCategories = useMemo(
    () => categories.filter((category) => category.is_active),
    [categories],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      try {
        setIsLoadingCategories(true);
        const response = await api.get<ItemCategoryResponse[]>("/item-categories");
        if (isMounted) setCategories(response.data);
      } catch (requestError) {
        if (isMounted) {
          setError(
            getApiErrorMessage(
              requestError,
              "Não foi possível carregar as categorias.",
            ),
          );
        }
      } finally {
        if (isMounted) setIsLoadingCategories(false);
      }
    }

    void loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    function protectUnsavedChanges(event: BeforeUnloadEvent) {
      if (!isDirty || isSubmitting) return;
      event.preventDefault();
    }

    window.addEventListener("beforeunload", protectUnsavedChanges);
    return () => window.removeEventListener("beforeunload", protectUnsavedChanges);
  }, [isDirty, isSubmitting]);

  function handleInputChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value, type } = event.target as HTMLInputElement;
    setIsDirty(true);

    if (type === "checkbox") {
      setFormData((previous) => ({
        ...previous,
        [name]: (event.target as HTMLInputElement).checked,
      }));
      return;
    }

    setFormData((previous) => ({ ...previous, [name]: value }));
  }

  function handleCancel(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!isDirty || window.confirm("Descartar as alterações deste produto?")) return;
    event.preventDefault();
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
        barcode: formData.barcode.trim() || null,
        unit_measure: formData.unit_measure,
        tracks_expiration: formData.tracks_expiration,
        is_active: formData.is_active,
        reference_unit_value: Number(formData.reference_unit_value),
        minimum_stock_alert: Number(formData.minimum_stock_alert),
        notes: formData.notes.trim() || null,
      };

      const response = await api.post<{ id: number; is_active: boolean }>(
        "/items",
        payload,
      );

      try {
        await persistProductImageSelection(response.data.id, imageSelection);
      } catch (imageError) {
        setIsDirty(false);
        navigate(`/items/${response.data.id}`, {
          state: {
            flash: {
              type: "error",
              message: `Produto cadastrado, mas a imagem não foi salva. ${getApiErrorMessage(
                imageError,
                "Revise a imagem no cadastro do produto.",
              )}`,
            },
          },
        });
        return;
      }

      setIsDirty(false);
      if (!response.data.is_active) {
        navigate(`/items/${response.data.id}`, {
          state: {
            flash: { type: "success", message: "Produto inativo cadastrado." },
          },
        });
        return;
      }

      navigate(`/stock-batches/new?itemId=${response.data.id}&from=item-create`, {
        state: {
          flash: {
            type: "success",
            message: "Produto cadastrado. Registre a primeira entrada.",
          },
        },
      });
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Não foi possível cadastrar o produto."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateBarcode(barcode: string) {
    setIsDirty(true);
    setFormData((previous) => ({ ...previous, barcode }));
  }

  function updateImageSelection(selection: ProductImageSelection) {
    setIsDirty(true);
    setImageSelection(selection);
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <h1>Novo produto</h1>
        <p>Dados do catálogo e controle de estoque.</p>
      </header>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.workspace}>
          <section className={styles.detailsCard} aria-labelledby="product-data-title">
            <header className={styles.cardHeader}>
              <span className={styles.cardIcon}>
                <PackagePlus aria-hidden="true" />
              </span>
              <h2 id="product-data-title">Dados do produto</h2>
            </header>

            <div className={styles.fields}>
              <label className={styles.field}>
                <span>Categoria <b>*</b></span>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleInputChange}
                  disabled={isLoadingCategories || activeCategories.length === 0}
                  required
                >
                  <option value="">
                    {isLoadingCategories
                      ? "Carregando…"
                      : activeCategories.length
                        ? "Selecione"
                        : "Nenhuma categoria ativa"}
                  </option>
                  {activeCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {!isLoadingCategories && activeCategories.length === 0 ? (
                  <small>
                    <Link to="/item-categories">Cadastre uma categoria</Link> para continuar.
                  </small>
                ) : null}
              </label>

              <label className={`${styles.field} ${styles.fieldName}`}>
                <span>Nome do produto <b>*</b></span>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  autoComplete="off"
                  required
                />
              </label>

              <label className={styles.field}>
                <span>Unidade de medida <b>*</b></span>
                <select
                  name="unit_measure"
                  value={formData.unit_measure}
                  onChange={handleInputChange}
                  required
                >
                  <option value="unidade">Unidade</option>
                  <option value="pacote">Pacote</option>
                  <option value="kg">Quilograma</option>
                  <option value="litro">Litro</option>
                  <option value="caixa">Caixa</option>
                  <option value="frasco">Frasco</option>
                </select>
              </label>

              <label className={styles.field}>
                <span>Valor estimado (R$)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  name="reference_unit_value"
                  value={formData.reference_unit_value}
                  onChange={handleInputChange}
                />
              </label>

              <label className={styles.field}>
                <span>Estoque mínimo</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  name="minimum_stock_alert"
                  value={formData.minimum_stock_alert}
                  onChange={handleInputChange}
                />
              </label>

              <div className={styles.switches}>
                <label className={styles.switchField}>
                  <span>
                    <strong>Controlar validade por lote</strong>
                    <small>Exige validade em cada recebimento.</small>
                  </span>
                  <input
                    type="checkbox"
                    name="tracks_expiration"
                    checked={formData.tracks_expiration}
                    onChange={handleInputChange}
                  />
                  <i aria-hidden="true" />
                </label>

                <label className={styles.switchField}>
                  <span>
                    <strong>Produto ativo</strong>
                    <small>Disponível para entradas e cestas.</small>
                  </span>
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                  />
                  <i aria-hidden="true" />
                </label>
              </div>

              <label className={`${styles.field} ${styles.fieldWide}`}>
                <span>Observações <em>(opcional)</em></span>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={4}
                />
              </label>
            </div>
          </section>

          <aside className={styles.imageColumn} aria-label="Imagem do produto">
            <ProductImagePicker
              productName={formData.name}
              barcode={formData.barcode}
              onBarcodeChange={updateBarcode}
              selection={imageSelection}
              onSelectionChange={updateImageSelection}
              disabled={isSubmitting}
            />
          </aside>
        </div>

        {error ? <p className={styles.error} role="alert">{error}</p> : null}

        <footer className={styles.actions}>
          <Link to="/items" className={styles.secondaryAction} onClick={handleCancel}>
            Cancelar
          </Link>
          <button
            type="submit"
            className={styles.primaryAction}
            disabled={
              isSubmitting || isLoadingCategories || activeCategories.length === 0
            }
          >
            <CheckCircle2 aria-hidden="true" />
            {isSubmitting
              ? "Salvando…"
              : formData.is_active
                ? "Salvar e registrar entrada"
                : "Cadastrar produto"}
          </button>
        </footer>
      </form>
    </div>
  );
}
