interface PaginationControlsProps {
  total: number;
  offset: number;
  limit: number;
  isLoading?: boolean;
  onPageChange: (nextOffset: number) => void;
}

export function PaginationControls({
  total,
  offset,
  limit,
  isLoading = false,
  onPageChange,
}: PaginationControlsProps) {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasPreviousPage = offset > 0;
  const hasNextPage = offset + limit < total;

  return (
    <div className="pagination-controls" aria-label="Paginacao">
      <span className="pagination-controls__summary">
        Pagina {currentPage} de {totalPages} | {total} registros
      </span>

      <div className="inline-actions">
        <button
          type="button"
          className="button button--secondary button--small"
          disabled={!hasPreviousPage || isLoading}
          onClick={() => onPageChange(Math.max(0, offset - limit))}
        >
          Anterior
        </button>

        <button
          type="button"
          className="button button--secondary button--small"
          disabled={!hasNextPage || isLoading}
          onClick={() => onPageChange(offset + limit)}
        >
          Proxima
        </button>
      </div>
    </div>
  );
}
