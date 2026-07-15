import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { DataTable } from "../components/DataTable";
import { MetricGrid } from "../components/MetricGrid";
import { PageHeader } from "../components/PageHeader";
import { PaginationControls } from "../components/PaginationControls";
import { PanelHeader } from "../components/PanelHeader";
import { StateMessage } from "../components/StateMessage";
import type { BasketTypeResponse } from "../types/basket";
import { getApiErrorMessage } from "../utils/api-error";
import {
  buildListSearchParams,
  getQueryOffset,
  getQueryText,
} from "../utils/list-query";

const PAGE_SIZE = 25;

export function BasketTypesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSearch = getQueryText(searchParams, "q");
  const activeFilter = getQueryText(searchParams, "active");
  const activeOffset = getQueryOffset(searchParams);
  const [basketTypes, setBasketTypes] = useState<BasketTypeResponse[]>([]);
  const [search, setSearch] = useState(activeSearch);
  const [statusDraft, setStatusDraft] = useState(activeFilter);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    void api
      .get<BasketTypeResponse[]>("/basket-types", {
        params: {
          q: activeSearch || undefined,
          is_active: activeFilter === "" ? undefined : activeFilter === "true",
          limit: PAGE_SIZE,
          offset: activeOffset,
        },
      })
      .then((response) => {
        if (!isCurrent) {
          return;
        }

        setBasketTypes(response.data);
        setTotal(Number(response.headers["x-total-count"] ?? response.data.length));
      })
      .catch((err) => {
        if (isCurrent) {
          setError(
            getApiErrorMessage(
              err,
              "Nao foi possivel carregar os tipos de cesta."
            )
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
  }, [activeFilter, activeOffset, activeSearch]);

  const summary = useMemo(() => {
    return {
      total,
      active: basketTypes.filter((basketType) => basketType.is_active).length,
      inactive: basketTypes.filter((basketType) => !basketType.is_active).length,
    };
  }, [basketTypes, total]);

  function handleApplyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setSearchParams((currentParams) =>
      buildListSearchParams(currentParams, {
        q: search.trim(),
        active: statusDraft,
        offset: null,
      })
    );
  }

  function handleClearFilters() {
    setSearch("");
    setStatusDraft("");
    setIsLoading(true);
    setError("");
    setSearchParams((currentParams) =>
      buildListSearchParams(currentParams, {
        q: null,
        active: null,
        offset: null,
      })
    );
  }

  function handlePageChange(nextOffset: number) {
    setIsLoading(true);
    setError("");
    setSearchParams((currentParams) =>
      buildListSearchParams(currentParams, { offset: nextOffset || null })
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Cestas"
        title="Tipos de cesta"
        description="Consulte modelos de cesta com filtros server-side e paginacao para crescimento da operacao."
      />

      <MetricGrid
        items={[
          {
            title: "Resultado filtrado",
            value: summary.total,
            description: "Modelos encontrados.",
          },
          {
            title: "Ativos",
            value: summary.active,
            description: "Nesta pagina.",
          },
          {
            title: "Inativos",
            value: summary.inactive,
            description: "Nesta pagina.",
          },
        ]}
      />

      <section className="panel-card">
        <PanelHeader
          eyebrow="Consulta"
          title="Modelos de cesta"
          stacked
          actions={
            <form className="toolbar toolbar--row" onSubmit={handleApplyFilters}>
              <label className="toolbar__field">
                <span className="sr-only">Buscar tipos de cesta</span>
                <input
                  className="toolbar__input"
                  type="text"
                  name="basket_types_search"
                  placeholder="Buscar por nome ou observacao..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>

              <label className="toolbar__field toolbar__field--select">
                <span className="sr-only">Filtrar tipos de cesta por status</span>
                <select
                  className="toolbar__input toolbar__input--select"
                  name="basket_types_status"
                  value={statusDraft}
                  onChange={(event) => setStatusDraft(event.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="true">Ativos</option>
                  <option value="false">Inativos</option>
                </select>
              </label>

              <button type="submit" className="button" disabled={isLoading}>
                {isLoading ? "Consultando..." : "Aplicar"}
              </button>

              <button
                type="button"
                className="button button--secondary"
                onClick={handleClearFilters}
                disabled={isLoading}
              >
                Limpar
              </button>

              <Link to="/basket-types/new" className="button button--link">
                Novo tipo
              </Link>
            </form>
          }
        />

        {isLoading ? (
          <StateMessage variant="loading">
            Carregando tipos de cesta...
          </StateMessage>
        ) : error ? (
          <StateMessage variant="error">{error}</StateMessage>
        ) : basketTypes.length === 0 ? (
          <StateMessage>
            Nenhum tipo de cesta encontrado para o filtro informado.
          </StateMessage>
        ) : (
          <>
            <DataTable caption="Modelos de cesta cadastrados">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Status</th>
                  <th>Observacoes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {basketTypes.map((basketType) => (
                  <tr key={basketType.id}>
                    <td>{basketType.name}</td>
                    <td>
                      {basketType.is_active ? (
                        <span className="pill pill--success">Ativa</span>
                      ) : (
                        <span className="pill">Inativa</span>
                      )}
                    </td>
                    <td>{basketType.notes || "Sem observacoes"}</td>
                    <td>
                      <Link
                        to={`/basket-types/${basketType.id}`}
                        className="table-link"
                      >
                        Ver detalhe
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>

            <PaginationControls
              total={total}
              offset={activeOffset}
              limit={PAGE_SIZE}
              isLoading={isLoading}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </section>
    </div>
  );
}
