import { matchPath } from "react-router-dom";

type RouteMeta = {
  pattern: string;
  title: string;
  section: string;
  sectionPath: string;
};

const ROUTE_META: RouteMeta[] = [
  { pattern: "/login", title: "Entrar", section: "Acesso", sectionPath: "/login" },
  { pattern: "/", title: "Dashboard", section: "Dashboard", sectionPath: "/" },
  {
    pattern: "/families",
    title: "Familias",
    section: "Familias",
    sectionPath: "/families",
  },
  {
    pattern: "/families/new",
    title: "Cadastrar familia",
    section: "Familias",
    sectionPath: "/families",
  },
  {
    pattern: "/families/:familyId",
    title: "Detalhe da familia",
    section: "Familias",
    sectionPath: "/families",
  },
  {
    pattern: "/families/:familyId/edit",
    title: "Editar familia",
    section: "Familias",
    sectionPath: "/families",
  },
  {
    pattern: "/families/:familyId/people/new",
    title: "Cadastrar pessoa",
    section: "Familias",
    sectionPath: "/families",
  },
  {
    pattern: "/families/:familyId/people/:personId/edit",
    title: "Editar pessoa",
    section: "Familias",
    sectionPath: "/families",
  },
  {
    pattern: "/families/:familyId/benefits/new",
    title: "Cadastrar beneficio",
    section: "Familias",
    sectionPath: "/families",
  },
  {
    pattern: "/families/:familyId/benefits/:benefitId/edit",
    title: "Editar beneficio",
    section: "Familias",
    sectionPath: "/families",
  },
  {
    pattern: "/families/:familyId/assessments/new",
    title: "Nova avaliacao social",
    section: "Familias",
    sectionPath: "/families",
  },
  { pattern: "/items", title: "Itens", section: "Estoque", sectionPath: "/items" },
  {
    pattern: "/items/new",
    title: "Cadastrar item",
    section: "Estoque",
    sectionPath: "/items",
  },
  {
    pattern: "/items/:itemId",
    title: "Detalhe do item",
    section: "Estoque",
    sectionPath: "/items",
  },
  {
    pattern: "/stock-batches/new",
    title: "Registrar entrada",
    section: "Estoque",
    sectionPath: "/items",
  },
  {
    pattern: "/stock-movements/new",
    title: "Registrar movimentacao",
    section: "Estoque",
    sectionPath: "/items",
  },
  {
    pattern: "/item-categories",
    title: "Categorias de item",
    section: "Categorias",
    sectionPath: "/item-categories",
  },
  {
    pattern: "/basket-types",
    title: "Tipos de cesta",
    section: "Cestas",
    sectionPath: "/basket-types",
  },
  {
    pattern: "/basket-types/new",
    title: "Novo tipo de cesta",
    section: "Cestas",
    sectionPath: "/basket-types",
  },
  {
    pattern: "/basket-types/:basketTypeId",
    title: "Detalhe da cesta",
    section: "Cestas",
    sectionPath: "/basket-types",
  },
  {
    pattern: "/deliveries",
    title: "Agendamentos e entregas",
    section: "Entregas",
    sectionPath: "/deliveries",
  },
  {
    pattern: "/deliveries/schedules/new",
    title: "Novo agendamento",
    section: "Entregas",
    sectionPath: "/deliveries",
  },
  {
    pattern: "/financial-summary",
    title: "Resumo financeiro",
    section: "Financeiro",
    sectionPath: "/financial-summary",
  },
  { pattern: "/users", title: "Usuarios", section: "Usuarios", sectionPath: "/users" },
  {
    pattern: "/audit-logs",
    title: "Auditoria",
    section: "Auditoria",
    sectionPath: "/audit-logs",
  },
];

export function getRouteMeta(pathname: string): RouteMeta {
  const exactMatch = ROUTE_META.find((route) =>
    matchPath({ path: route.pattern, end: true }, pathname)
  );

  return (
    exactMatch ?? {
      pattern: "*",
      title: "Pagina nao encontrada",
      section: "Cesta Digital",
      sectionPath: "/",
    }
  );
}

