import { expect, test, type Page, type Route } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const evidenceDirectory = path.resolve(currentDirectory, "../../showcase/evidence/v2-10");

const currentUser = {
  id: 1,
  name: "Ana Silva",
  login_name: "ana.silva",
  email: "ana@cestadigital.org",
  is_active: true,
  roles: ["admin"],
};

const operations = {
  items: [
    { id: 124, family_id: 1, family_code: "FAM-01248", family_status: "apta_recorrente", basket_type_id: 1, basket_type_name: "Cesta Básica", scheduled_date: "2026-08-21", status: "agendado", notes: "Retirada confirmada por telefone.", street: "Rua das Flores", number: "123", complement: null, neighborhood: "Jardim Primavera", city: "São Paulo", state: "SP" },
    { id: 123, family_id: 2, family_code: "FAM-01247", family_status: "apta_emergencial", basket_type_id: 2, basket_type_name: "Cesta Proteica", scheduled_date: "2026-08-21", status: "reagendado", notes: "Nova data combinada com a família.", street: "Avenida Central", number: "456", complement: null, neighborhood: "Centro", city: "São Paulo", state: "SP" },
    { id: 122, family_id: 3, family_code: "FAM-01246", family_status: "apta_recorrente", basket_type_id: 1, basket_type_name: "Cesta Básica", scheduled_date: "2026-08-21", status: "agendado", notes: null, street: "Rua das Acácias", number: "789", complement: null, neighborhood: "Vila Nova", city: "São Paulo", state: "SP" },
    { id: 121, family_id: 4, family_code: "FAM-01245", family_status: "apta_recorrente", basket_type_id: 3, basket_type_name: "Cesta Vegana", scheduled_date: "2026-08-21", status: "retirado", notes: "Entrega concluída no período da manhã.", street: "Rua dos Lírios", number: "321", complement: null, neighborhood: "Jardim Europa", city: "São Paulo", state: "SP" },
    { id: 120, family_id: 5, family_code: "FAM-01244", family_status: "apta_recorrente", basket_type_id: 1, basket_type_name: "Cesta Básica", scheduled_date: "2026-08-21", status: "agendado", notes: null, street: "Avenida das Palmeiras", number: "654", complement: null, neighborhood: "Bela Vista", city: "São Paulo", state: "SP" },
    { id: 119, family_id: 6, family_code: "FAM-01243", family_status: "em_analise", basket_type_id: 2, basket_type_name: "Cesta Proteica", scheduled_date: "2026-08-21", status: "cancelado", notes: "Avaliação deve ser revisada.", street: "Rua do Sol", number: "987", complement: null, neighborhood: "Centro", city: "São Paulo", state: "SP" },
    { id: 118, family_id: 7, family_code: "FAM-01242", family_status: "apta_emergencial", basket_type_id: 1, basket_type_name: "Cesta Básica", scheduled_date: "2026-08-21", status: "faltou", notes: "Família não compareceu.", street: "Rua das Orquídeas", number: "147", complement: null, neighborhood: "Vila Nova", city: "São Paulo", state: "SP" },
    { id: 117, family_id: 8, family_code: "FAM-01241", family_status: "apta_recorrente", basket_type_id: 3, basket_type_name: "Cesta Vegana", scheduled_date: "2026-08-21", status: "agendado", notes: null, street: "Avenida Brasil", number: "159", complement: null, neighborhood: "Jardim América", city: "São Paulo", state: "SP" },
  ],
  total: 15,
  limit: 8,
  offset: 0,
  reference_date: "2026-08-21",
  period: "hoje",
  summary: { scheduled: 8, rescheduled: 2, completed: 4, exceptions: 1, total: 15 },
};

const deliveries = [
  {
    id: 81,
    delivery_schedule_id: 121,
    family_id: 4,
    basket_type_id: 3,
    delivery_date: "2026-08-21T10:20:00",
    delivered_by_user_id: 1,
    status: "concluida",
    notes: "Entrega concluída com conferência.",
    items: [
      { movement_id: 91, item_id: 1, item_name: "Arroz Branco 5kg", unit_measure: "un.", batch_id: 18, batch_code: "ARZ250822", batch_status: "disponivel", storage_location: "Prateleira A", expiration_date: "2027-08-20", quantity: 1 },
      { movement_id: 92, item_id: 2, item_name: "Feijão Carioca 1kg", unit_measure: "un.", batch_id: 17, batch_code: "FEJ250819", batch_status: "disponivel", storage_location: "Prateleira A", expiration_date: "2027-02-10", quantity: 2 },
    ],
  },
];

const eligibleFamilies = [
  { id: 1, internal_code: "FAM-01248", status: "apta_recorrente", city: "São Paulo", state: "SP" },
  { id: 2, internal_code: "FAM-01247", status: "apta_emergencial", city: "São Paulo", state: "SP" },
];

const basketTypes = [
  { id: 1, name: "Cesta Básica", is_active: true, notes: null },
  { id: 2, name: "Cesta Proteica", is_active: true, notes: null },
];

async function fulfillJson(route: Route, body: unknown, headers = {}) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    headers,
    body: JSON.stringify(body),
  });
}

async function mockApi(page: Page) {
  await page.route("**/auth/me", (route) => fulfillJson(route, currentUser));
  await page.route("**/delivery-operations?**", (route) =>
    fulfillJson(route, operations, { "X-Total-Count": String(operations.total) }),
  );
  await page.route("**/families?**", (route) => fulfillJson(route, eligibleFamilies));
  await page.route("**/basket-types?**", (route) => fulfillJson(route, basketTypes));
  await page.route("**/deliveries?**", async (route) => {
    if (route.request().resourceType() === "document") {
      await route.fallback();
      return;
    }
    await fulfillJson(route, deliveries, { "X-Total-Count": "1" });
  });
}

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test("entregas segue a composição aprovada com dados operacionais reais", async ({ page }, testInfo) => {
  await page.goto("/deliveries");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { name: "Entregas", exact: true })).toBeVisible();
  await expect(page.getByText("Rota de hoje")).toHaveCount(0);

  const viewportWidth = page.viewportSize()?.width ?? 0;
  const table = page.getByRole("table", { name: "Agenda de entregas" });
  if (viewportWidth >= 1100) {
    await expect(table).toBeVisible();
    await expect(table.getByText("FAM-01248")).toBeVisible();
    await expect(table.getByText("Apta recorrente").first()).toBeVisible();
    await expect(page.getByLabel("Entrega selecionada")).toBeVisible();
    await expect(
      page.getByLabel("Navegação principal").getByRole("link", { name: "Entregas" }),
    ).toHaveAttribute("aria-current", "page");
  } else {
    await expect(table).toBeHidden();
    const mobileAgenda = page.getByLabel("Agenda em cartões");
    await expect(mobileAgenda.getByRole("button").first()).toBeVisible();
    await expect(mobileAgenda.getByText("FAM-01248")).toBeVisible();
    await expect(mobileAgenda.getByText(/Apta recorrente/).first()).toBeVisible();
    await expect(
      page.getByLabel("Atalhos principais").getByRole("link", { name: "Entregas" }),
    ).toHaveAttribute("aria-current", "page");
  }

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);

  await page.screenshot({
    path: path.join(evidenceDirectory, `entregas-${testInfo.project.name}.png`),
    fullPage: true,
  });
});

test("histórico rastreável preserva lote e validade sem overflow", async ({ page }, testInfo) => {
  test.skip(
    !["mobile-390", "desktop-1440"].includes(testInfo.project.name),
    "Evidência do histórico concentrada nos viewports de aprovação.",
  );
  await page.goto("/deliveries?view=history");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { name: "Histórico rastreável" })).toBeVisible();
  await expect(page.getByText("ARZ250822")).toBeVisible();
  await expect(page.getByText(/Validade 20\/08\/2027/)).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: path.join(evidenceDirectory, `entregas-historico-${testInfo.project.name}.png`),
    fullPage: true,
  });
});

test("novo agendamento apresenta somente famílias aptas", async ({ page }, testInfo) => {
  test.skip(
    !["mobile-390", "desktop-1440"].includes(testInfo.project.name),
    "Evidência do formulário concentrada nos viewports de aprovação.",
  );
  await page.goto("/deliveries/schedules/new");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { name: "Nova entrega", exact: true })).toBeVisible();
  await expect(page.getByRole("combobox", { name: /Família apta/ }).locator("option")).toHaveCount(3);
  await expect(page.getByText(/decisão vigente da avaliação social/i)).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: path.join(evidenceDirectory, `entregas-formulario-${testInfo.project.name}.png`),
    fullPage: true,
  });
});
