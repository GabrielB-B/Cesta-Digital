import type { StockBatchResponse } from "../types/item";

const SOURCE_TYPE_LABELS: Record<string, string> = {
  doacao_item: "Doação de item",
  compra_igreja: "Compra com recursos da instituição",
  conversao_dinheiro: "Conversão de doação em dinheiro",
  ajuste: "Ajuste de inventário",
};

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  saida_manual: "Saída manual",
  perda_validade: "Perda por validade",
  ajuste_negativo: "Ajuste negativo",
  ajuste_positivo: "Ajuste positivo",
  saida_entrega: "Saída para entrega",
};

const SAO_PAULO_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

export type BatchExpirationTone = "danger" | "warning" | "success" | "neutral";
export type BatchExpirationCode =
  | "no_stock"
  | "not_tracked"
  | "missing"
  | "invalid"
  | "expired"
  | "today"
  | "near_expiration"
  | "valid";

export interface BatchExpirationStatus {
  code: BatchExpirationCode;
  label: string;
  tone: BatchExpirationTone;
  isCritical: boolean;
  blocksManualExit: boolean;
}

export function formatStockSourceType(sourceType: string): string {
  return SOURCE_TYPE_LABELS[sourceType] ?? sourceType.replaceAll("_", " ");
}

export function formatStockMovementType(movementType: string): string {
  return (
    MOVEMENT_TYPE_LABELS[movementType] ?? movementType.replaceAll("_", " ")
  );
}

function parseDateOnly(value: string): number | null {
  const [datePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const timestamp = Date.UTC(year, month - 1, day);
  const parsedDate = new Date(timestamp);

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    return null;
  }

  return timestamp;
}

function getSaoPauloCivilDateParts(date: Date) {
  const parts = SAO_PAULO_DATE_FORMATTER.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return { year, month, day };
}

function getSaoPauloCivilDateTimestamp(date: Date): number {
  const { year, month, day } = getSaoPauloCivilDateParts(date);

  return Date.UTC(year, month - 1, day);
}

export function formatSaoPauloTodayForInput(date = new Date()): string {
  const { year, month, day } = getSaoPauloCivilDateParts(date);

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function isStockBatchReceived(
  batch: StockBatchResponse,
  today = new Date()
): boolean {
  const entryTimestamp = parseDateOnly(batch.entry_date);

  return (
    entryTimestamp !== null &&
    entryTimestamp <= getSaoPauloCivilDateTimestamp(today)
  );
}

export function getBatchExpirationStatus(
  batch: StockBatchResponse,
  tracksExpiration: boolean,
  today = new Date()
): BatchExpirationStatus {
  if (batch.current_quantity <= 0) {
    return {
      code: "no_stock",
      label: "Sem saldo",
      tone: "neutral",
      isCritical: false,
      blocksManualExit: true,
    };
  }

  if (!batch.expiration_date) {
    if (!tracksExpiration) {
      return {
        code: "not_tracked",
        label: "Não controla",
        tone: "neutral",
        isCritical: false,
        blocksManualExit: false,
      };
    }

    return {
      code: "missing",
      label: "Validade não informada",
      tone: "danger",
      isCritical: true,
      blocksManualExit: true,
    };
  }

  const expirationTimestamp = parseDateOnly(batch.expiration_date);

  if (expirationTimestamp === null) {
    return {
      code: "invalid",
      label: "Data inválida",
      tone: "danger",
      isCritical: true,
      blocksManualExit: true,
    };
  }

  const referenceTimestamp = getSaoPauloCivilDateTimestamp(today);
  const remainingDays = Math.round(
    (expirationTimestamp - referenceTimestamp) / 86_400_000
  );

  if (remainingDays < 0) {
    return {
      code: "expired",
      label: "Vencido",
      tone: "danger",
      isCritical: true,
      blocksManualExit: true,
    };
  }

  if (remainingDays === 0) {
    return {
      code: "today",
      label: "Vence hoje",
      tone: "warning",
      isCritical: true,
      blocksManualExit: false,
    };
  }

  if (remainingDays <= 30) {
    return {
      code: "near_expiration",
      label: "Vence em breve",
      tone: "warning",
      isCritical: true,
      blocksManualExit: false,
    };
  }

  return {
    code: "valid",
    label: "Dentro da validade",
    tone: "success",
    isCritical: false,
    blocksManualExit: false,
  };
}

export function getBatchExpirationSortValue(batch: StockBatchResponse): number {
  if (!batch.expiration_date) {
    return Number.MAX_SAFE_INTEGER;
  }

  return parseDateOnly(batch.expiration_date) ?? Number.MAX_SAFE_INTEGER;
}

export function compareStockBatchesByFefo(
  first: StockBatchResponse,
  second: StockBatchResponse
): number {
  return (
    getBatchExpirationSortValue(first) - getBatchExpirationSortValue(second) ||
    (parseDateOnly(first.entry_date) ?? Number.MAX_SAFE_INTEGER) -
      (parseDateOnly(second.entry_date) ?? Number.MAX_SAFE_INTEGER) ||
    first.id - second.id
  );
}
