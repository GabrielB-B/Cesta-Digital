import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { DataTable } from "../components/DataTable";
import { MetricGrid } from "../components/MetricGrid";
import { PageHeader } from "../components/PageHeader";
import { PanelHeader } from "../components/PanelHeader";
import { PaginationControls } from "../components/PaginationControls";
import { StateMessage } from "../components/StateMessage";
import type { FamilyListItemResponse } from "../types/family";
import { getApiErrorMessage } from "../utils/api-error";
import { formatCurrency } from "../utils/format";

const PAGE_SIZE = 25;

const familyStatusOptions = [
  { value: "", label: "Todos os status" },
  { value: "apta_recorrente", label: "Apta recorrente" },
  { value: "apta_emergencial", label: "Apta emergencial" },
  { value: "em_analise", label: "Em analise" },
  { value: "inapta", label: "Inapta" },
  { value: "inativa", label: "Inativa" },
];

function formatStatus(status: string): string {
  return (
    familyStatusOptions.find((option) => option.value === status)?.label ?? status
  );
}

export function FamiliesPage() {
  const [families, setFamilies] = useState<FamilyListItemResponse[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadFamilies(nextOffset = offset) {
    try {
      setIsLoading(true);
      setError("");

      const response = await api.get<FamilyListItemResponse[]>("/families", {
        params: {
          q: search.trim() || undefined,
          status: status || undefined,
          limit: PAGE_SIZE,
          offset: nextOffset,
        },
      });

      setFamilies(response.data);
      setTotal(Number(response.headers["x-total-count"] ?? response.data.length));
      setOffset(nextOffset);
    } catch (err) {
      setError(getApiErrorMessage(err, "Nao foi possivel carregar as familias."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadFamilies(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => {
    return {
      total,
      recurring: families.filter((family) => family.status === "apta_recorrente")
        .length,
      emergency: families.filter(
        (family) => family.status === "apta_emergencial"
      ).length,
      underReview: families.filter((family) => family.status === "em_analise")
        .length,
    };
  }, [families, total]);

  async function handleApplyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadFamilies(0);
  }

  function handleClearFilters() {
    setSearch("");
    setStatus("");
    setTimeout(() => void loadFamilies(0), 0);
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Modulo social"
        title="Familias"
        description="Consulte familias por busca e status direto no servidor, com paginacao para bases maiores."
      />

      <MetricGrid
        items={[
          {
            title: "Resultado filtrado",
            value: summary.total,
            description: "Familias encontradas na consulta atual.",
          },
          {
            title: "Aptas recorrentes",
            value: summary.recurring,
            description: "Nesta pagina.",
          },
          {
            title: "Aptas emergenciais",
            value: summary.emergency,
            description: "Nesta pagina.",
          },
          {
            title: "Em analise",
            value: summary.underReview,
            description: "Nesta pagina.",
          },
        ]}
      />

      <section className="panel-card">
        <PanelHeader
          eyebrow="Consulta"
          title="Familias cadastradas"
          stacked
          actions={
            <form className="toolbar toolbar--row" onSubmit={handleApplyFilters}>
            <label className="toolbar__field">
              <span className="sr-only">Buscar familias</span>
              <input
                className="toolbar__input"
                type="text"
                name="families_search"
                placeholder="Buscar por codigo, cidade, bairro ou status..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </label>

            <label className="toolbar__field toolbar__field--select">
              <span className="sr-only">Filtrar por status</span>
              <select
                className="toolbar__input toolbar__input--select"
                name="family_status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {familyStatusOptions.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
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

            <Link to="/families/new" className="button button--link">
              Nova familia
            </Link>
          </form>
          }
        />

        {isLoading ? (
          <StateMessage variant="loading">Carregando familias...</StateMessage>
        ) : error ? (
          <StateMessage variant="error">{error}</StateMessage>
        ) : families.length === 0 ? (
          <StateMessage>
            Nenhuma familia encontrada para o filtro informado.
          </StateMessage>
        ) : (
          <>
            <DataTable caption="Familias cadastradas">
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Status</th>
                  <th>Cidade</th>
                  <th>Moradores</th>
                  <th>Renda per capita</th>
                  <th>Contato principal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {families.map((family) => (
                  <tr key={family.id}>
                    <td>{family.internal_code}</td>
                    <td>
                      <span className="pill">{formatStatus(family.status)}</span>
                    </td>
                    <td>
                      {family.city}/{family.state}
                    </td>
                    <td>{family.total_residents}</td>
                    <td>{formatCurrency(family.income_per_capita)}</td>
                    <td>{family.contacts[0]?.contact_name ?? "Sem contato"}</td>
                    <td>
                      <Link to={`/families/${family.id}`} className="table-link">
                        Ver detalhe
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>

            <PaginationControls
              total={total}
              offset={offset}
              limit={PAGE_SIZE}
              isLoading={isLoading}
              onPageChange={(nextOffset) => void loadFamilies(nextOffset)}
            />
          </>
        )}
      </section>
    </div>
  );
}
