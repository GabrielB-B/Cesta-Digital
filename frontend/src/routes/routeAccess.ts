import type { AppRole } from "../types/auth";

/**
 * Contratos de acesso compartilhados por rotas e navegação.
 *
 * O backend continua sendo a autoridade de autorização. Estes grupos evitam
 * que router, shell e ações contextuais divirjam durante a migração visual.
 */
export const ROUTE_ACCESS = {
  authenticated: ["admin", "lider_social", "operador"],
  social: ["admin", "lider_social"],
  operations: ["admin", "operador"],
  administration: ["admin"],
} as const satisfies Record<string, readonly AppRole[]>;

export function userHasAnyRole(
  userRoles: readonly string[],
  allowedRoles: readonly AppRole[]
): boolean {
  return allowedRoles.some((role) => userRoles.includes(role));
}
