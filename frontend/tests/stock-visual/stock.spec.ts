import path from "node:path";
import { expect, test, type Route } from "@playwright/test";
import { openFactsProductImageBase64 } from "./fixtures";

const evidenceDirectory = path.resolve("showcase/evidence/v2-08");
const openFactsImageUrl =
  "https://images.openfoodfacts.org/images/products/789/100/010/0103/front_pt.34.400.jpg";
const persistedProductImagePath = "/public/items/1/image?v=visual-fixture";

const currentUser = {
  id: 1,
  name: "Ana Silva",
  login_name: "ana.silva",
  email: "ana.silva@cestadigital.org",
  is_active: true,
  roles: ["admin", "lider_social", "operador"],
};

const stockItems = [
  {
    item_id: 1,
    item_name: "Leite Condensado Moça 395g",
    category_id: 1,
    category_name: "Laticínios",
    unit_measure: "un.",
    tracks_expiration: true,
    is_active: true,
    minimum_stock_alert: 30,
    total_quantity: 24,
    total_batches: 2,
    is_below_minimum: true,
    next_expiration_date: "2026-08-28",
    expiring_soon_batches: 1,
    expired_batches: 0,
    missing_expiration_batches: 0,
    restricted_batches: 0,
  },
  {
    item_id: 2,
    item_name: "Óleo de Soja 900ml",
    category_id: 2,
    category_name: "Óleos",
    unit_measure: "un.",
    tracks_expiration: true,
    is_active: true,
    minimum_stock_alert: 10,
    total_quantity: 15,
    total_batches: 1,
    is_below_minimum: false,
    next_expiration_date: "2026-08-26",
    expiring_soon_batches: 1,
    expired_batches: 0,
    missing_expiration_batches: 0,
    restricted_batches: 0,
  },
  {
    item_id: 3,
    item_name: "Feijão Carioca 1kg",
    category_id: 3,
    category_name: "Grãos",
    unit_measure: "un.",
    tracks_expiration: true,
    is_active: true,
    minimum_stock_alert: 5,
    total_quantity: 0,
    total_batches: 1,
    is_below_minimum: true,
    next_expiration_date: null,
    expiring_soon_batches: 0,
    expired_batches: 1,
    missing_expiration_batches: 0,
    restricted_batches: 0,
  },
  {
    item_id: 4,
    item_name: "Arroz Branco 5kg",
    category_id: 3,
    category_name: "Grãos",
    unit_measure: "un.",
    tracks_expiration: true,
    is_active: true,
    minimum_stock_alert: 20,
    total_quantity: 42,
    total_batches: 2,
    is_below_minimum: false,
    next_expiration_date: "2026-10-12",
    expiring_soon_batches: 0,
    expired_batches: 0,
    missing_expiration_batches: 0,
    restricted_batches: 0,
  },
  {
    item_id: 5,
    item_name: "Açúcar Cristal 1kg",
    category_id: 4,
    category_name: "Açúcares",
    unit_measure: "un.",
    tracks_expiration: true,
    is_active: true,
    minimum_stock_alert: 10,
    total_quantity: 30,
    total_batches: 1,
    is_below_minimum: false,
    next_expiration_date: "2026-09-18",
    expiring_soon_batches: 0,
    expired_batches: 0,
    missing_expiration_batches: 0,
    restricted_batches: 0,
  },
  {
    item_id: 6,
    item_name: "Café Torrado 500g",
    category_id: 5,
    category_name: "Bebidas",
    unit_measure: "un.",
    tracks_expiration: true,
    is_active: true,
    minimum_stock_alert: 10,
    total_quantity: 0,
    total_batches: 1,
    is_below_minimum: true,
    next_expiration_date: null,
    expiring_soon_batches: 0,
    expired_batches: 0,
    missing_expiration_batches: 0,
    restricted_batches: 1,
  },
  {
    item_id: 7,
    item_name: "Macarrão Espaguete 500g",
    category_id: 6,
    category_name: "Massas",
    unit_measure: "un.",
    tracks_expiration: true,
    is_active: true,
    minimum_stock_alert: 15,
    total_quantity: 60,
    total_batches: 2,
    is_below_minimum: false,
    next_expiration_date: "2026-11-20",
    expiring_soon_batches: 0,
    expired_batches: 0,
    missing_expiration_batches: 0,
    restricted_batches: 0,
  },
  {
    item_id: 8,
    item_name: "Sabonete Neutro",
    category_id: 7,
    category_name: "Higiene",
    unit_measure: "un.",
    tracks_expiration: true,
    is_active: true,
    minimum_stock_alert: 12,
    total_quantity: 25,
    total_batches: 1,
    is_below_minimum: false,
    next_expiration_date: null,
    expiring_soon_batches: 0,
    expired_batches: 0,
    missing_expiration_batches: 1,
    restricted_batches: 0,
  },
].map((item, index) => ({
  ...item,
  barcode: index === 0 ? "7891000100103" : null,
  image_path: index === 0 ? persistedProductImagePath : null,
  image_source: index === 0 ? "open_facts" : null,
  image_attribution:
    index === 0 ? "Open Food Facts contributors · CC BY-SA 3.0" : null,
}));

const overview = {
  items: stockItems,
  total: 128,
  limit: 25,
  offset: 0,
  reference_date: "2026-08-20",
  due_soon_days: 15,
  summary: {
    total_items: 128,
    active_items: 126,
    low_stock_items: 23,
    expiring_soon_batches: 18,
    expired_batches: 3,
    missing_expiration_batches: 1,
    restricted_batches: 1,
  },
};

const movements = [
  { id: 3, batch_id: 22, item_id: 1, movement_type: "ajuste_positivo", quantity: 20, notes: "Conferência", created_by_user_id: 1 },
  { id: 2, batch_id: 18, item_id: 1, movement_type: "saida_manual", quantity: 10, notes: null, created_by_user_id: 1 },
  { id: 1, batch_id: 11, item_id: 1, movement_type: "ajuste_positivo", quantity: 15, notes: "Recebimento", created_by_user_id: 1 },
];

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

test.beforeEach(async ({ page }) => {
  const productImageBody = Buffer.from(openFactsProductImageBase64, "base64");
  await page.route("**/public/items/1/image**", (route) =>
    route.fulfill({ status: 200, contentType: "image/jpeg", body: productImageBody }),
  );
  await page.route(openFactsImageUrl, (route) =>
    route.fulfill({ status: 200, contentType: "image/jpeg", body: productImageBody }),
  );
  await page.route("**/auth/me", (route) => fulfillJson(route, currentUser));
  await page.route("**/stock-overview**", (route) => fulfillJson(route, overview));
  await page.route("**/stock-movements**", (route) => {
    const itemId = Number(new URL(route.request().url()).searchParams.get("item_id"));
    return fulfillJson(
      route,
      movements.filter((movement) => movement.item_id === itemId),
    );
  });
  await page.goto("/items");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { name: "Estoque", exact: true })).toBeVisible();
});

test("estoque usa painel no desktop, cards nas telas menores e não causa overflow", async ({ page }, testInfo) => {
  const viewportWidth = page.viewportSize()?.width ?? 0;
  const table = page.getByRole("table", { name: "Produtos e saldos disponíveis" });
  const visibleProductImage = page
    .locator('img[alt="Produto Leite Condensado Moça 395g"]:visible')
    .first();

  await expect(visibleProductImage).toBeVisible();
  await expect
    .poll(() =>
      visibleProductImage.evaluate(
        (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
      ),
    )
    .toBe(true);

  if (viewportWidth >= 1100) {
    await expect(table).toBeVisible();
    await expect(page.getByLabel("Item selecionado")).toBeVisible();
    await expect(
      page.getByLabel("Navegação principal").getByRole("link", { name: "Estoque" }),
    ).toHaveAttribute("aria-current", "page");
  } else {
    await expect(table).toBeHidden();
    await expect(page.locator("article").first()).toBeVisible();
    await expect(page.getByLabel("Item selecionado")).toBeHidden();
    await expect(
      page.getByLabel("Atalhos principais").getByRole("link", { name: "Estoque" }),
    ).toHaveAttribute("aria-current", "page");
  }

  await expect(page.getByText("Família Silva")).toHaveCount(0);
  await expect(page.getByText("Exportar", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Transferir estoque", { exact: true })).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);

  await page.screenshot({
    path: path.join(evidenceDirectory, `estoque-${testInfo.project.name}.png`),
    fullPage: viewportWidth >= 1100,
  });
});

test("cadastro mostra upload, consulta assistida e fallback de forma responsiva", async ({ page }, testInfo) => {
  test.skip(
    !["mobile-390", "desktop-1440"].includes(testInfo.project.name),
    "Evidência do formulário concentrada nos dois viewports de aprovação.",
  );

  await page.route("**/item-categories**", (route) =>
    fulfillJson(route, [
      { id: 1, name: "Laticínios", description: null, is_active: true },
      { id: 2, name: "Higiene", description: null, is_active: true },
    ]),
  );
  await page.route("**/product-images/open-facts**", (route) =>
    fulfillJson(route, {
      barcode: "7891000100103",
      found: true,
      has_image: true,
      product_name: "Leite Condensado Integral Moça",
      brands: "Nestlé, Moça",
      quantity: "395 g",
      image_url: openFactsImageUrl,
      source_name: "Open Food Facts",
      attribution: "Open Food Facts contributors · CC BY-SA 3.0",
      license_name: "CC BY-SA 3.0",
      license_url: "https://creativecommons.org/licenses/by-sa/3.0/",
    }),
  );

  await page.goto("/items/new");
  await page.getByLabel("Nome do item").fill("Leite Condensado Moça 395g");
  await page.getByLabel("Código EAN/GTIN").fill("7891000100103");
  await page.getByRole("button", { name: "Consultar" }).click();
  await expect(page.getByText("Leite Condensado Integral Moça")).toBeVisible();
  await expect(page.getByText("Open Food Facts contributors · CC BY-SA 3.0")).toBeVisible();
  await page.getByRole("button", { name: "Usar esta foto" }).click();
  await expect(page.getByRole("button", { name: "Selecionada" })).toBeDisabled();

  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(100);

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);

  await page.screenshot({
    path: path.join(evidenceDirectory, `estoque-imagens-${testInfo.project.name}.png`),
    fullPage: true,
  });
});

test("indicadores e busca mantêm o filtro operacional na URL", async ({ page }) => {
  await page.getByRole("button", { name: /Estoque baixo/ }).click();
  await expect(page).toHaveURL(/attention=estoque_baixo/);

  await page.getByLabel("Buscar produtos no estoque").fill("Higiene");
  await page.getByLabel("Buscar produtos no estoque").press("Enter");
  await expect(page).toHaveURL(/q=Higiene/);
});

test("seleção desktop troca o contexto sem inventar operações", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "Painel contextual existe somente no desktop.");

  await page.getByRole("button", { name: "Selecionar Óleo de Soja 900ml" }).click();
  await expect(page).toHaveURL(/selected=2/);
  await expect(page.getByLabel("Item selecionado").getByText("Óleo de Soja 900ml")).toBeVisible();
  await expect(page.getByRole("link", { name: "Registrar saída ou ajuste" })).toHaveAttribute(
    "href",
    "/stock-movements/new?itemId=2",
  );
});
