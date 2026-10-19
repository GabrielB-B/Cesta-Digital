import { useEffect, useState, type FormEvent } from "react";
import { MapPin, Search, ShieldCheck, UsersRound } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type { OperationalFamilyResponse } from "../types/family";
import { getApiErrorMessage } from "../utils/api-error";
import { buildListSearchParams, getQueryOffset, getQueryText } from "../utils/list-query";
import styles from "./OperationalFamiliesPage.module.css";

const PAGE_SIZE = 25;

const statusLabels: Record<string, string> = {
  apta_recorrente: "Apta recorrente",
  apta_emergencial: "Apta emergencial",
  em_analise: "Em análise",
  inapta: "Inapta",
  inativa: "Inativa",
};

export function OperationalFamiliesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = getQueryText(searchParams, "q");
  const offset = getQueryOffset(searchParams);
  const [families, setFamilies] = useState<OperationalFamilyResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    void api.get<OperationalFamilyResponse[]>("/operational/families", {
      params: { q: query || undefined, limit: PAGE_SIZE, offset },
    }).then((response) => {
      if (!isCurrent) return;
      setFamilies(response.data);
      setTotal(Number(response.headers["x-total-count"] ?? response.data.length));
      setError("");
    }).catch((requestError) => {
      if (isCurrent) {
        setError(getApiErrorMessage(requestError, "Não foi possível carregar as famílias."));
      }
    }).finally(() => {
      if (isCurrent) setIsLoading(false);
    });

    return () => { isCurrent = false; };
  }, [offset, query]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextQuery = String(formData.get("family_search") ?? "").trim();
    setIsLoading(true);
    setError("");
    setSearchParams((current) => buildListSearchParams(current, {
      q: nextQuery || null,
      offset: null,
    }));
  }

  function handlePageChange(nextOffset: number) {
    setIsLoading(true);
    setError("");
    setSearchParams((current) => buildListSearchParams(current, {
      offset: nextOffset || null,
    }));
  }

  const hasPrevious = offset > 0;
  const hasNext = offset + families.length < total;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Consulta operacional</span>
          <h1>Famílias</h1>
          <p>Localize a família para registrar uma entrega. Os dados sociais são protegidos.</p>
        </div>
        <div className={styles.readOnlyBadge}>
          <ShieldCheck aria-hidden="true" />
          Somente visualização
        </div>
      </header>

      <form className={styles.searchBar} onSubmit={handleSearch} role="search">
        <Search aria-hidden="true" />
        <label className={styles.srOnly} htmlFor="family-search">Buscar família</label>
        <input
          id="family-search"
          name="family_search"
          type="search"
          defaultValue={query}
          placeholder="Buscar por responsável, bairro ou cidade…"
          autoComplete="off"
        />
        <button type="submit">Buscar</button>
      </form>

      <section className={styles.directory} aria-label="Famílias cadastradas">
        {isLoading ? (
          <p className={styles.state} role="status">Carregando famílias…</p>
        ) : error ? (
          <p className={styles.stateError} role="alert">{error}</p>
        ) : families.length === 0 ? (
          <p className={styles.state}>Nenhuma família encontrada.</p>
        ) : (
          <div className={styles.grid}>
            {families.map((family) => (
              <article className={styles.familyCard} key={family.id}>
                <span className={styles.familyIcon}><UsersRound aria-hidden="true" /></span>
                <div className={styles.familyCopy}>
                  <div className={styles.familyTitle}>
                    <h2>{family.display_name}</h2>
                    <span data-eligible={family.eligible_for_delivery}>
                      {statusLabels[family.status] ?? family.status}
                    </span>
                  </div>
                  <p><MapPin aria-hidden="true" />{family.neighborhood}, {family.city}/{family.state}</p>
                  <small>{family.total_residents} {family.total_residents === 1 ? "morador" : "moradores"}</small>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {!isLoading && !error && total > 0 ? (
        <footer className={styles.footer}>
          <span>Exibindo {offset + 1}–{Math.min(offset + families.length, total)} de {total}</span>
          <div>
            <button
              type="button"
              disabled={!hasPrevious}
              onClick={() => handlePageChange(Math.max(0, offset - PAGE_SIZE))}
            >Anterior</button>
            <button
              type="button"
              disabled={!hasNext}
              onClick={() => handlePageChange(offset + PAGE_SIZE)}
            >Próxima</button>
          </div>
        </footer>
      ) : null}
    </div>
  );
}
