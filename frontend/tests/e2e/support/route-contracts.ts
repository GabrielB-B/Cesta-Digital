import type { AppRole } from "../../../src/types/auth";

export interface RouteContract {
  path: string;
  title: string;
  sectionPath: string;
  allowedRoles: readonly AppRole[] | "public";
}

export interface NavigationContract {
  path: string;
  label: string;
  allowedRoles: readonly AppRole[];
}

const allRoles = ["admin", "lider_social", "operador"] as const;
const socialRoles = ["admin", "lider_social"] as const;
const operationsRoles = ["admin", "operador"] as const;
const administrationRoles = ["admin"] as const;

/**
 * Baseline independente do router de produção.
 * Uma mudança intencional de URL, título ou RBAC exige atualizar este contrato
 * em um requisito funcional separado, nunca como efeito colateral visual.
 */
export const APP_ROUTE_CONTRACTS = [
  {
    path: "/login",
    title: "Entrar",
    sectionPath: "/login",
    allowedRoles: "public",
  },
  {
    path: "/",
    title: "Dashboard",
    sectionPath: "/",
    allowedRoles: allRoles,
  },
  {
    path: "/families",
    title: "Familias",
    sectionPath: "/families",
    allowedRoles: socialRoles,
  },
  {
    path: "/assessments",
    title: "Avaliações",
    sectionPath: "/assessments",
    allowedRoles: socialRoles,
  },
  {
    path: "/families/new",
    title: "Cadastrar familia",
    sectionPath: "/families",
    allowedRoles: socialRoles,
  },
  {
    path: "/families/1",
    title: "Detalhe da familia",
    sectionPath: "/families",
    allowedRoles: socialRoles,
  },
  {
    path: "/families/1/edit",
    title: "Editar familia",
    sectionPath: "/families",
    allowedRoles: socialRoles,
  },
  {
    path: "/families/1/people/new",
    title: "Cadastrar pessoa",
    sectionPath: "/families",
    allowedRoles: socialRoles,
  },
  {
    path: "/families/1/people/1/edit",
    title: "Editar pessoa",
    sectionPath: "/families",
    allowedRoles: socialRoles,
  },
  {
    path: "/families/1/benefits/new",
    title: "Cadastrar beneficio",
    sectionPath: "/families",
    allowedRoles: socialRoles,
  },
  {
    path: "/families/1/benefits/1/edit",
    title: "Editar beneficio",
    sectionPath: "/families",
    allowedRoles: socialRoles,
  },
  {
    path: "/families/1/assessments/new",
    title: "Nova avaliação social",
    sectionPath: "/assessments",
    allowedRoles: socialRoles,
  },
  {
    path: "/items",
    title: "Itens",
    sectionPath: "/items",
    allowedRoles: operationsRoles,
  },
  {
    path: "/items/new",
    title: "Cadastrar item",
    sectionPath: "/items",
    allowedRoles: operationsRoles,
  },
  {
    path: "/items/1",
    title: "Detalhe do item",
    sectionPath: "/items",
    allowedRoles: operationsRoles,
  },
  {
    path: "/item-categories",
    title: "Categorias de item",
    sectionPath: "/item-categories",
    allowedRoles: operationsRoles,
  },
  {
    path: "/stock-batches",
    title: "Entradas",
    sectionPath: "/stock-batches",
    allowedRoles: operationsRoles,
  },
  {
    path: "/stock-batches/new",
    title: "Registrar entrada",
    sectionPath: "/stock-batches",
    allowedRoles: operationsRoles,
  },
  {
    path: "/stock-movements/new",
    title: "Registrar movimentacao",
    sectionPath: "/items",
    allowedRoles: operationsRoles,
  },
  {
    path: "/basket-types",
    title: "Tipos de cesta",
    sectionPath: "/basket-types",
    allowedRoles: operationsRoles,
  },
  {
    path: "/basket-types/new",
    title: "Novo tipo de cesta",
    sectionPath: "/basket-types",
    allowedRoles: operationsRoles,
  },
  {
    path: "/basket-types/1",
    title: "Detalhe da cesta",
    sectionPath: "/basket-types",
    allowedRoles: operationsRoles,
  },
  {
    path: "/deliveries",
    title: "Agendamentos e entregas",
    sectionPath: "/deliveries",
    allowedRoles: operationsRoles,
  },
  {
    path: "/deliveries/schedules/new",
    title: "Novo agendamento",
    sectionPath: "/deliveries",
    allowedRoles: operationsRoles,
  },
  {
    path: "/financial-summary",
    title: "Resumo financeiro",
    sectionPath: "/financial-summary",
    allowedRoles: socialRoles,
  },
  {
    path: "/users",
    title: "Usuarios",
    sectionPath: "/users",
    allowedRoles: administrationRoles,
  },
  {
    path: "/audit-logs",
    title: "Auditoria",
    sectionPath: "/audit-logs",
    allowedRoles: administrationRoles,
  },
] as const satisfies readonly RouteContract[];

export const NAVIGATION_CONTRACTS = [
  { path: "/", label: "Início", allowedRoles: allRoles },
  { path: "/families", label: "Famílias", allowedRoles: socialRoles },
  { path: "/assessments", label: "Avaliações", allowedRoles: socialRoles },
  {
    path: "/financial-summary",
    label: "Financeiro",
    allowedRoles: socialRoles,
  },
  { path: "/items", label: "Estoque", allowedRoles: operationsRoles },
  {
    path: "/stock-batches",
    label: "Entradas",
    allowedRoles: operationsRoles,
  },
  {
    path: "/item-categories",
    label: "Categorias",
    allowedRoles: operationsRoles,
  },
  {
    path: "/basket-types",
    label: "Tipos de Cesta",
    allowedRoles: operationsRoles,
  },
  {
    path: "/deliveries",
    label: "Entregas",
    allowedRoles: operationsRoles,
  },
  {
    path: "/users",
    label: "Usuários",
    allowedRoles: administrationRoles,
  },
  {
    path: "/audit-logs",
    label: "Auditoria",
    allowedRoles: administrationRoles,
  },
] as const satisfies readonly NavigationContract[];
