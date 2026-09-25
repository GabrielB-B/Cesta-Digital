import path from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";
import { openFactsProductImageBase64 } from "../stock-visual/fixtures";

const evidenceDirectory = path.resolve("showcase/evidence/v2-11");
const imagePath = "/public/items/1/image?v=basket-visual";

const currentUser = {
  id: 1,
  name: "Ana Silva",
  login_name: "ana.silva",
  email: "ana.silva@cestadigital.org",
  is_active: true,
  roles: ["admin", "lider_social", "operador"],
};

const products = [
  [1, "Leite Condensado Moça 395g", "Laticínios", "unidade", true, "9.90", 1],
  [2, "Feijão Carioca 1kg", "Grãos", "pacote", true, "8.60", 3],
  [3, "Óleo de Soja 900ml", "Óleos", "unidade", true, "7.80", 2],
  [4, "Açúcar Cristal 1kg", "Açúcares", "pacote", true, "5.40", 3],
  [5, "Macarrão Espaguete 500g", "Massas", "pacote", true, "4.90", 4],
  [6, "Leite Integral 1L", "Laticínios", "litro", true, "6.50", 5],
  [7, "Café Torrado 500g", "Bebidas", "pacote", true, "26.30", 1],
  [8, "Sal Refinado 1kg", "Temperos", "pacote", false, "3.20", 2],
] as const;

const recipeItems = products.map(([id, name, category, unit, expiration, value, quantity]) => ({
  id,
  item_id: id,
  item_name: name,
  category_name: category,
  unit_measure: unit,
  tracks_expiration: expiration,
  reference_unit_value: value,
  image_path: id === 1 ? imagePath : null,
  image_source: id === 1 ? "open_facts" : null,
  image_attribution: id === 1 ? "Open Food Facts contributors · CC BY-SA 3.0" : null,
  required_quantity: quantity,
}));

const basketOverview = [
  { id: 1, name: "Cesta Básica", is_active: true, notes: "Composição mensal para atendimento recorrente.", item_count: 8, estimated_value: "152.30", updated_at: "2026-08-20T10:30:00" },
  { id: 2, name: "Cesta Premium", is_active: true, notes: "Composição ampliada.", item_count: 12, estimated_value: "284.60", updated_at: "2026-08-18T14:20:00" },
  { id: 3, name: "Cesta Solidária", is_active: true, notes: "Composição emergencial enxuta.", item_count: 6, estimated_value: "98.40", updated_at: "2026-08-16T09:15:00" },
];

const basketDetail = {
  id: 1,
  name: "Cesta Básica",
  is_active: true,
  notes: "Composição mensal para atendimento recorrente.",
  basket_items: recipeItems,
};

const availability = {
  basket_type_id: 1,
  basket_type_name: "Cesta Básica",
  possible_baskets: 18,
  limiting_item_ids: [6],
  items: recipeItems.map((item) => ({
    item_id: item.item_id,
    item_name: item.item_name,
    unit_measure: item.unit_measure,
    required_quantity: item.required_quantity,
    available_quantity: item.item_id === 6 ? 54 : 120,
    possible_from_item: item.item_id === 6 ? 18 : 40,
    missing_for_next_basket: item.item_id === 6 ? 3 : item.required_quantity,
  })),
};

const itemResponses = recipeItems.map((item, index) => ({
  id: item.item_id,
  category_id: index + 1,
  category_name: item.category_name,
  name: item.item_name,
  barcode: null,
  unit_measure: item.unit_measure,
  tracks_expiration: item.tracks_expiration,
  is_active: true,
  reference_unit_value: item.reference_unit_value,
  minimum_stock_alert: 5,
  notes: null,
  has_image: item.image_path !== null,
  image_path: item.image_path,
  image_source: item.image_source,
  image_attribution: item.image_attribution,
}));

async function fulfillJson(route: Route, body: unknown, headers = {}) {
  await route.fulfill({ status: 200, contentType: "application/json", headers, body: JSON.stringify(body) });
}

async function mockApi(page: Page) {
  await page.route("**/auth/me", (route) => fulfillJson(route, currentUser));
  await page.route("**/basket-types/overview?**", (route) => fulfillJson(route, basketOverview, { "X-Total-Count": "3" }));
  await page.route(/\/basket-types\/\d+\/availability(?:\?.*)?$/, (route) => fulfillJson(route, availability));
  await page.route(/\/basket-types\/\d+(?:\?.*)?$/, async (route) => {
    if (route.request().resourceType() === "document") {
      await route.fallback();
      return;
    }
    await fulfillJson(route, basketDetail);
  });
  await page.route("**/basket-types?**", (route) => fulfillJson(route, basketOverview.map((item) => ({ id: item.id, name: item.name, is_active: item.is_active, notes: item.notes }))));
  await page.route("**/items?**", (route) => fulfillJson(route, itemResponses, { "X-Total-Count": String(itemResponses.length) }));
  await page.route("**/public/items/1/image**", (route) => route.fulfill({ status: 200, contentType: "image/jpeg", body: Buffer.from(openFactsProductImageBase64, "base64") }));
}

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test("tipos de cesta segue a referência com composição e resumo reais", async ({ page }, testInfo) => {
  await page.goto("/basket-types");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { name: "Tipos de cesta", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Cesta Básica/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("R$ 152,30").first()).toBeVisible();

  const viewportWidth = page.viewportSize()?.width ?? 0;
  const table = page.getByRole("table", { name: "Produtos da cesta Cesta Básica" });
  if (viewportWidth >= 1100) {
    await expect(table).toBeVisible();
    await expect(page.getByLabel("Resumo da cesta selecionada")).toBeVisible();
    await expect(page.getByLabel("Navegação principal").getByRole("link", { name: "Tipos de Cesta" })).toHaveAttribute("aria-current", "page");
  } else {
    await expect(table).toBeHidden();
    await expect(page.getByLabel("Composição em cartões").getByText("Leite Condensado Moça 395g")).toBeVisible();
    await expect(page.getByLabel("Atalhos principais").getByRole("link", { name: "Tipos de Cesta" })).toHaveAttribute("aria-current", "page");
  }

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: path.join(evidenceDirectory, `tipos-cesta-${testInfo.project.name}.png`), fullPage: true });
});

test("editor preserva composição, imagens e capacidade", async ({ page }, testInfo) => {
  test.skip(!["mobile-390", "desktop-1440"].includes(testInfo.project.name), "Evidência do editor concentrada nos viewports de aprovação.");
  await page.goto("/basket-types/1");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { name: "Cesta Básica", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Composição da cesta" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Capacidade de montagem" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Produto Leite Condensado Moça 395g" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: path.join(evidenceDirectory, `tipos-cesta-editor-${testInfo.project.name}.png`), fullPage: true });
});

test("cadastro orienta a montagem sem prometer composição automática", async ({ page }, testInfo) => {
  test.skip(!["mobile-390", "desktop-1440"].includes(testInfo.project.name), "Evidência do cadastro concentrada nos viewports de aprovação.");
  await page.goto("/basket-types/new");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { name: "Nova cesta", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Como funciona" })).toBeVisible();
  await expect(page.getByText("Valide a capacidade")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: path.join(evidenceDirectory, `tipos-cesta-cadastro-${testInfo.project.name}.png`), fullPage: true });
});
