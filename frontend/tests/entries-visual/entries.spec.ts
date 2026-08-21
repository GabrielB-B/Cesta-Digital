import { expect, test, type Page, type Route } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openFactsProductImageBase64 } from "../stock-visual/fixtures";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const evidenceDirectory = path.resolve(currentDirectory, "../../showcase/evidence/v2-09");

const currentUser = {
  id: 1,
  name: "Ana Silva",
  login_name: "ana.silva",
  email: "ana@cestadigital.org",
  is_active: true,
  roles: ["admin"],
};

const imagePath = "/public/items/1/image?v=visual";
const items = [
  { id: 1, category_id: 1, category_name: "Grãos", name: "Arroz Branco 5kg", barcode: "7891000100103", unit_measure: "un.", tracks_expiration: true, is_active: true, reference_unit_value: "26.90", minimum_stock_alert: 20, notes: null, has_image: true, image_path: imagePath, image_source: "open_facts", image_attribution: "Open Food Facts contributors · CC BY-SA 3.0" },
  { id: 2, category_id: 1, category_name: "Grãos", name: "Feijão Carioca 1kg", barcode: null, unit_measure: "un.", tracks_expiration: true, is_active: true, reference_unit_value: "8.90", minimum_stock_alert: 15, notes: null, has_image: false, image_path: null, image_source: null, image_attribution: null },
  { id: 3, category_id: 2, category_name: "Óleos", name: "Óleo de Soja 900ml", barcode: null, unit_measure: "un.", tracks_expiration: true, is_active: true, reference_unit_value: "7.80", minimum_stock_alert: 12, notes: null, has_image: false, image_path: null, image_source: null, image_attribution: null },
  { id: 4, category_id: 3, category_name: "Laticínios", name: "Leite Integral 1L", barcode: null, unit_measure: "un.", tracks_expiration: true, is_active: true, reference_unit_value: "5.60", minimum_stock_alert: 30, notes: null, has_image: false, image_path: null, image_source: null, image_attribution: null },
  { id: 5, category_id: 4, category_name: "Higiene", name: "Sabonete neutro", barcode: null, unit_measure: "un.", tracks_expiration: false, is_active: true, reference_unit_value: "2.90", minimum_stock_alert: 20, notes: null, has_image: false, image_path: null, image_source: null, image_attribution: null },
];

const batches = [
  { id: 18, item_id: 1, batch_code: "ARZ250822", source_type: "doacao_item", status: "disponivel", entry_quantity: 100, current_quantity: 100, entry_date: "2026-08-20", expiration_date: "2027-08-20", storage_location: "Prateleira A · nível 1", quarantine_reason: null, estimated_unit_value: "26.90", notes: null, created_by_user_id: 1 },
  { id: 17, item_id: 2, batch_code: "FEJ250819", source_type: "compra_igreja", status: "disponivel", entry_quantity: 50, current_quantity: 42, entry_date: "2026-08-19", expiration_date: "2027-02-10", storage_location: "Prateleira A · nível 2", quarantine_reason: null, estimated_unit_value: "8.90", notes: null, created_by_user_id: 1 },
  { id: 16, item_id: 3, batch_code: "OLE250818", source_type: "doacao_item", status: "disponivel", entry_quantity: 30, current_quantity: 30, entry_date: "2026-08-18", expiration_date: "2026-09-01", storage_location: "Prateleira B · nível 1", quarantine_reason: null, estimated_unit_value: "7.80", notes: null, created_by_user_id: 1 },
  { id: 15, item_id: 4, batch_code: "LEI250817", source_type: "doacao_item", status: "quarentena", entry_quantity: 24, current_quantity: 24, entry_date: "2026-08-17", expiration_date: "2026-08-25", storage_location: "Área de conferência", quarantine_reason: "Conferir integridade das embalagens", estimated_unit_value: "5.60", notes: null, created_by_user_id: 1 },
  { id: 14, item_id: 5, batch_code: "SAB250816", source_type: "conversao_dinheiro", status: "disponivel", entry_quantity: 60, current_quantity: 60, entry_date: "2026-08-16", expiration_date: null, storage_location: "Prateleira H · nível 2", quarantine_reason: null, estimated_unit_value: "2.90", notes: null, created_by_user_id: 1 },
  { id: 13, item_id: 2, batch_code: "FEJ250812", source_type: "ajuste", status: "bloqueado", entry_quantity: 8, current_quantity: 8, entry_date: "2026-08-12", expiration_date: "2026-08-10", storage_location: "Área segregada", quarantine_reason: "Lote vencido", estimated_unit_value: "8.50", notes: null, created_by_user_id: 1 },
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
  const productImageBody = Buffer.from(openFactsProductImageBase64, "base64");
  await page.route("**/public/items/1/image**", (route) =>
    route.fulfill({ status: 200, contentType: "image/jpeg", body: productImageBody }),
  );
  await page.route("**/auth/me", (route) => fulfillJson(route, currentUser));
  await page.route("**/items?**", (route) => fulfillJson(route, items));
  await page.route(/\/items$/, async (route) => {
    if (route.request().resourceType() === "document") {
      await route.fallback();
      return;
    }
    await fulfillJson(route, items);
  });
  await page.route("**/stock-batches?**", (route) =>
    fulfillJson(route, batches, { "X-Total-Count": String(batches.length) }),
  );
  await page.route(/\/stock-batches$/, async (route) => {
    if (route.request().resourceType() === "document") {
      await route.fallback();
      return;
    }
    await fulfillJson(route, batches[0], { "X-Total-Count": String(batches.length) });
  });
}

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test("entradas preserva tabela no desktop, cards no mobile e contexto ativo", async ({ page }, testInfo) => {
  await page.goto("/stock-batches");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { name: "Entradas", exact: true })).toBeVisible();

  const viewportWidth = page.viewportSize()?.width ?? 0;
  const table = page.getByRole("table", { name: "Histórico de lotes recebidos" });

  if (viewportWidth >= 1100) {
    await expect(table).toBeVisible();
    await expect(page.getByLabel("Cadastro rápido de entrada")).toBeVisible();
    await expect(
      page.getByLabel("Navegação principal").getByRole("link", { name: "Entradas" }),
    ).toHaveAttribute("aria-current", "page");
  } else {
    await expect(table).toBeHidden();
    await expect(page.getByLabel("Entradas em cartões").locator("article").first()).toBeVisible();
    await expect(page.getByLabel("Cadastro rápido de entrada")).toBeHidden();
    await expect(
      page.getByLabel("Atalhos principais").getByRole("link", { name: "Entradas" }),
    ).toHaveAttribute("aria-current", "page");
  }

  await expect(page.getByText("Família Silva")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);

  await page.screenshot({
    path: path.join(evidenceDirectory, `entradas-${testInfo.project.name}.png`),
    fullPage: true,
  });
});

test("formulário dedicado mantém os campos reais sem overflow", async ({ page }, testInfo) => {
  test.skip(
    !["mobile-390", "desktop-1440"].includes(testInfo.project.name),
    "Evidência do formulário concentrada nos viewports de aprovação.",
  );

  await page.goto("/stock-batches/new?itemId=1");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { level: 1, name: "Registrar entrada" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Item", exact: true })).toHaveValue("1");
  await expect(page.getByLabel("Data de validade do lote")).toBeEnabled();

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);

  await page.screenshot({
    path: path.join(evidenceDirectory, `entradas-formulario-${testInfo.project.name}.png`),
    fullPage: true,
  });
});
