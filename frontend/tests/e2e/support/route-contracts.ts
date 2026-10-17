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

const allRoles = ["admin", "lider_social", "operador", "colaborador"] as const;
const familyRoles = ["admin", "lider_social", "colaborador"] as const;
const assessmentRoles = ["admin", "lider_social"] as const;
const inventoryRoles = ["admin", "operador", "colaborador"] as const;
const inventoryConfigurationRoles = ["admin", "operador"] as const;
const deliveryRoles = ["admin", "operador", "colaborador"] as const;
const reportRoles = ["admin", "lider_social", "operador"] as const;
const socialReportRoles = ["admin", "lider_social"] as const;
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
    title: "Famílias",
    sectionPath: "/families",
    allowedRoles: familyRoles,
  },
  {
    path: "/assessments",
    title: "Análises sociais",
    sectionPath: "/assessments",
    allowedRoles: assessmentRoles,
  },
  {
    path: "/families/new",
    title: "Cadastrar família",
    sectionPath: "/families",
    allowedRoles: familyRoles,
  },
  {
    path: "/families/1",
    title: "Detalhe da família",
    sectionPath: "/families",
    allowedRoles: familyRoles,
  },
  {
    path: "/families/1/edit",
    title: "Editar família",
    sectionPath: "/families",
    allowedRoles: familyRoles,
  },
  {
    path: "/families/1/people/new",
    title: "Cadastrar pessoa",
    sectionPath: "/families",
    allowedRoles: familyRoles,
  },
  {
    path: "/families/1/people/1/edit",
    title: "Editar pessoa",
    sectionPath: "/families",
    allowedRoles: familyRoles,
  },
  {
    path: "/families/1/benefits/new",
    title: "Cadastrar benefício",
    sectionPath: "/families",
    allowedRoles: familyRoles,
  },
  {
    path: "/families/1/benefits/1/edit",
    title: "Editar benefício",
    sectionPath: "/families",
    allowedRoles: familyRoles,
  },
  {
    path: "/families/1/assessments/new",
    title: "Nova avaliação social",
    sectionPath: "/assessments",
    allowedRoles: assessmentRoles,
  },
  {
    path: "/items",
    title: "Itens",
    sectionPath: "/items",
    allowedRoles: inventoryRoles,
  },
  {
    path: "/items/new",
    title: "Novo produto",
    sectionPath: "/items",
    allowedRoles: inventoryRoles,
  },
  {
    path: "/items/1",
    title: "Detalhe do item",
    sectionPath: "/items",
    allowedRoles: inventoryRoles,
  },
  {
    path: "/item-categories",
    title: "Categorias de item",
    sectionPath: "/item-categories",
    allowedRoles: inventoryConfigurationRoles,
  },
  {
    path: "/stock-batches",
    title: "Entradas",
    sectionPath: "/stock-batches",
    allowedRoles: inventoryRoles,
  },
  {
    path: "/stock-batches/new",
    title: "Registrar entrada",
    sectionPath: "/stock-batches",
    allowedRoles: inventoryRoles,
  },
  {
    path: "/stock-movements/new",
    title: "Registrar movimentação",
    sectionPath: "/items",
    allowedRoles: inventoryRoles,
  },
  {
    path: "/basket-types",
    title: "Tipos de cesta",
    sectionPath: "/basket-types",
    allowedRoles: inventoryConfigurationRoles,
  },
  {
    path: "/basket-types/new",
    title: "Nova cesta",
    sectionPath: "/basket-types",
    allowedRoles: inventoryConfigurationRoles,
  },
  {
    path: "/basket-types/1",
    title: "Editar cesta",
    sectionPath: "/basket-types",
    allowedRoles: inventoryConfigurationRoles,
  },
  {
    path: "/deliveries",
    title: "Entregas",
    sectionPath: "/deliveries",
    allowedRoles: deliveryRoles,
  },
  {
    path: "/deliveries/schedules/new",
    title: "Nova entrega",
    sectionPath: "/deliveries",
    allowedRoles: deliveryRoles,
  },
  {
    path: "/reports",
    title: "Relatórios",
    sectionPath: "/reports",
    allowedRoles: reportRoles,
  },
  {
    path: "/financial-summary",
    title: "Relatórios",
    sectionPath: "/reports",
    allowedRoles: socialReportRoles,
  },
  {
    path: "/users",
    title: "Administração",
    sectionPath: "/users",
    allowedRoles: administrationRoles,
  },
  {
    path: "/audit-logs",
    title: "Auditoria",
    sectionPath: "/users",
    allowedRoles: administrationRoles,
  },
] as const satisfies readonly RouteContract[];

export const NAVIGATION_CONTRACTS = [
  { path: "/", label: "Início", allowedRoles: allRoles },
  { path: "/families", label: "Famílias", allowedRoles: familyRoles },
  { path: "/assessments", label: "Análises sociais", allowedRoles: assessmentRoles },
  {
    path: "/reports",
    label: "Relatórios",
    allowedRoles: reportRoles,
  },
  { path: "/items", label: "Estoque", allowedRoles: inventoryRoles },
  {
    path: "/stock-batches",
    label: "Entradas",
    allowedRoles: inventoryRoles,
  },
  {
    path: "/item-categories",
    label: "Categorias",
    allowedRoles: inventoryConfigurationRoles,
  },
  {
    path: "/basket-types",
    label: "Tipos de Cesta",
    allowedRoles: inventoryConfigurationRoles,
  },
  {
    path: "/deliveries",
    label: "Entregas",
    allowedRoles: deliveryRoles,
  },
  {
    path: "/users",
    label: "Administração",
    allowedRoles: administrationRoles,
  },
] as const satisfies readonly NavigationContract[];
