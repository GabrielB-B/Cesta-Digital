import axios from "axios";

interface ValidationIssue {
  msg?: string;
  loc?: Array<string | number>;
}

function normalizeValidationIssues(detail: ValidationIssue[]): string {
  const messages = detail
    .map((issue) => {
      if (!issue.msg) {
        return "";
      }

      const field = issue.loc?.[issue.loc.length - 1];
      return field ? `${String(field)}: ${issue.msg}` : issue.msg;
    })
    .filter(Boolean);

  return messages.join(" | ");
}

export function getApiErrorMessage(
  error: unknown,
  fallbackMessage: string
): string {
  if (!axios.isAxiosError(error)) {
    return fallbackMessage;
  }

  const detail = error.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail)) {
    const normalized = normalizeValidationIssues(detail as ValidationIssue[]);
    if (normalized) {
      return normalized;
    }
  }

  if (error.code === "ECONNABORTED") {
    return "A resposta da API demorou mais do que o esperado.";
  }

  if (error.response?.status === 401) {
    return "Sua sessao expirou. Entre novamente.";
  }

  if (error.response?.status === 403) {
    return "Voce nao tem permissao para executar esta acao.";
  }

  if (error.response?.status === 429) {
    return "Muitas tentativas ou requisicoes em sequencia. Aguarde e tente novamente.";
  }

  if (!error.response) {
    return "Nao foi possivel conectar ao backend.";
  }

  return fallbackMessage;
}
