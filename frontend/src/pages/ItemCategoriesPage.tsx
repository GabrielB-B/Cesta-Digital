import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Archive,
  CheckCircle2,
  FolderTree,
  Pencil,
  Plus,
  Save,
  Search,
  Tag,
  X,
} from "lucide-react";
import { api } from "../api/client";
import type { ItemCategoryPayload, ItemCategoryResponse } from "../types/item";
import { getApiErrorMessage } from "../utils/api-error";
import styles from "./ItemCategoriesPage.module.css";

interface CategoryFormData {
  id: number | null;
  name: string;
  description: string;
  is_active: boolean;
}

const EMPTY_FORM: CategoryFormData = {
  id: null,
  name: "",
  description: "",
  is_active: true,
};

function toFormData(category: ItemCategoryResponse): CategoryFormData {
  return {
    id: category.id,
    name: category.name,
    description: category.description ?? "",
    is_active: category.is_active,
  };
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

export function ItemCategoriesPage() {
  const [categories, setCategories] = useState<ItemCategoryResponse[]>([]);
  const [formData, setFormData] = useState<CategoryFormData>(EMPTY_FORM);
  const [savedFormData, setSavedFormData] = useState<CategoryFormData>(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const editorRef = useRef<HTMLElement>(null);
  const editorHeadingRef = useRef<HTMLHeadingElement>(null);

  async function reloadCategories() {
    setIsLoading(true);
    try {
      const response = await api.get<ItemCategoryResponse[]>("/item-categories");
      setCategories(response.data);
      setError("");
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Não foi possível carregar as categorias."),
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isCurrent = true;

    void api
      .get<ItemCategoryResponse[]>("/item-categories")
      .then((response) => {
        if (isCurrent) {
          setCategories(response.data);
          setError("");
        }
      })
      .catch((requestError) => {
        if (isCurrent) {
          setError(
            getApiErrorMessage(
              requestError,
              "Não foi possível carregar as categorias.",
            ),
          );
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const isDirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(savedFormData),
    [formData, savedFormData],
  );

  useEffect(() => {
    if (!isDirty) {
      return undefined;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const filteredCategories = useMemo(() => {
    const query = normalizeSearch(search);
    if (!query) {
      return categories;
    }

    return categories.filter((category) =>
      normalizeSearch(`${category.name} ${category.description ?? ""}`).includes(query),
    );
  }, [categories, search]);

  const activeCount = categories.filter((category) => category.is_active).length;
  const inactiveCount = categories.length - activeCount;

  function canDiscardChanges() {
    return !isDirty || window.confirm("Descartar as alterações ainda não salvas?");
  }

  function focusEditor() {
    window.requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({ block: "nearest" });
      editorHeadingRef.current?.focus();
    });
  }

  function startCreate() {
    if (!canDiscardChanges()) {
      return;
    }

    setFormData(EMPTY_FORM);
    setSavedFormData(EMPTY_FORM);
    setError("");
    setSuccessMessage("");
    focusEditor();
  }

  function handleEdit(category: ItemCategoryResponse) {
    if (category.id !== formData.id && !canDiscardChanges()) {
      return;
    }

    const nextFormData = toFormData(category);
    setFormData(nextFormData);
    setSavedFormData(nextFormData);
    setError("");
    setSuccessMessage("");
    focusEditor();
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
          payload,
        );
        setSuccessMessage("Categoria atualizada.");
      } else {
        await api.post<ItemCategoryResponse>("/item-categories", payload);
        setSuccessMessage("Categoria cadastrada.");
      }

      setFormData(EMPTY_FORM);
      setSavedFormData(EMPTY_FORM);
      await reloadCategories();
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Não foi possível salvar a categoria."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1>Categorias</h1>
          <p>Organize os grupos usados no cadastro de produtos.</p>
        </div>
      </header>

      {error ? <p className={styles.feedbackError} role="alert">{error}</p> : null}
      {successMessage ? (
        <p className={styles.feedbackSuccess} role="status">{successMessage}</p>
      ) : null}

      <div className={styles.workspace}>
        <section className={styles.listPanel} aria-labelledby="category-list-title">
          <header className={styles.panelHeader}>
            <div>
              <h2 id="category-list-title">Categorias cadastradas</h2>
              <p>
                {categories.length} no total · {activeCount} ativa{activeCount === 1 ? "" : "s"}
                {inactiveCount ? ` · ${inactiveCount} inativa${inactiveCount === 1 ? "" : "s"}` : ""}
              </p>
            </div>
            <FolderTree aria-hidden="true" />
          </header>

          <label className={styles.searchField}>
            <Search aria-hidden="true" />
            <span className="sr-only">Buscar categorias</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar categoria"
              autoComplete="off"
            />
          </label>

          {isLoading ? (
            <div className={styles.loadingState} aria-live="polite">
              <span>Carregando categorias…</span>
              {Array.from({ length: 3 }, (_, index) => (
                <span className={styles.skeletonRow} key={index} aria-hidden="true" />
              ))}
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className={styles.emptyState}>
              <Archive aria-hidden="true" />
              <strong>Nenhuma categoria encontrada</strong>
              <span>{search ? "Revise a busca." : "Cadastre a primeira categoria."}</span>
            </div>
          ) : (
            <div className={styles.categoryList}>
              {filteredCategories.map((category) => {
                const isSelected = formData.id === category.id;
                return (
                  <article
                    key={category.id}
                    className={`${styles.categoryRow}${isSelected ? ` ${styles.categoryRowSelected}` : ""}`}
                    aria-label={`Categoria ${category.name}`}
                  >
                    <span className={styles.categoryIcon}>
                      <Tag aria-hidden="true" />
                    </span>
                    <div className={styles.categoryIdentity}>
                      <h3>{category.name}</h3>
                      <p>{category.description || "Descrição não informada"}</p>
                    </div>
                    <span
                      className={`${styles.statusBadge} ${
                        category.is_active ? styles.statusActive : styles.statusInactive
                      }`}
                    >
                      {category.is_active ? <CheckCircle2 aria-hidden="true" /> : null}
                      {category.is_active ? "Ativa" : "Inativa"}
                    </span>
                    <button
                      type="button"
                      className={styles.editAction}
                      onClick={() => handleEdit(category)}
                      aria-label={`Editar ${category.name}`}
                    >
                      <Pencil aria-hidden="true" /> Editar
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside
          ref={editorRef}
          className={styles.editorPanel}
          aria-labelledby="category-editor-title"
        >
          <header className={styles.editorHeader}>
            <span className={styles.editorIcon}>
              {formData.id ? <Pencil aria-hidden="true" /> : <Plus aria-hidden="true" />}
            </span>
            <div>
              <h2 id="category-editor-title" ref={editorHeadingRef} tabIndex={-1}>
                {formData.id ? "Editar categoria" : "Nova categoria"}
              </h2>
              {formData.id ? <p>Atualizando “{savedFormData.name}”</p> : null}
            </div>
            {formData.id ? (
              <button type="button" onClick={startCreate} aria-label="Cancelar edição">
                <X aria-hidden="true" />
              </button>
            ) : null}
          </header>

          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.field}>
              <span>Nome</span>
              <input
                value={formData.name}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, name: event.target.value }))
                }
                autoComplete="off"
                required
              />
            </label>

            <label className={styles.field}>
              <span>Descrição <small>(opcional)</small></span>
              <textarea
                value={formData.description}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={5}
              />
            </label>

            <label className={styles.switchField}>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    is_active: event.target.checked,
                  }))
                }
              />
              <span>
                <strong>Categoria ativa</strong>
                <small>Disponível para novos produtos</small>
              </span>
              <i aria-hidden="true" />
            </label>

            <div className={styles.formActions}>
              {formData.id ? (
                <button type="button" onClick={startCreate} disabled={isSubmitting}>
                  Cancelar
                </button>
              ) : null}
              <button type="submit" className={styles.saveAction} disabled={isSubmitting}>
                <Save aria-hidden="true" />
                {isSubmitting
                  ? "Salvando…"
                  : formData.id
                    ? "Salvar categoria"
                    : "Cadastrar categoria"}
              </button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}
