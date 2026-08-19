import { expect, test, type Route } from "@playwright/test";

const currentUser = {
  id: 1,
  name: "Ana Silva",
  login_name: "ana.silva",
  email: "ana.silva@cestadigital.org",
  is_active: true,
  roles: ["admin", "lider_social", "operador"],
};

const dashboard = {
  total_families: 248,
  active_families: 176,
  recurring_eligible_families: 132,
  emergency_eligible_families: 14,
  under_review_families: 30,
  inactive_families: 72,
  pending_schedules: 15,
  deliveries_this_month: 42,
  upcoming_revaluations_count: 8,
  items_below_minimum_count: 23,
  basket_summaries: [
    { basket_type_id: 1, basket_type_name: "Cesta Básica", possible_baskets: 28 },
    { basket_type_id: 2, basket_type_name: "Cesta Emergencial", possible_baskets: 12 },
  ],
  upcoming_revaluations: [
    {
      family_id: 1,
      internal_code: "FAM-01248",
      status: "apta_recorrente",
      next_revaluation_date: "2026-08-25",
    },
  ],
  stock_alerts: [
    {
      item_id: 1,
      item_name: "Leite Integral 1L",
      category_name: "Laticínios",
      minimum_stock_alert: 30,
      total_quantity: 24,
      is_below_minimum: true,
    },
    {
      item_id: 2,
      item_name: "Óleo de Soja 900ml",
      category_name: "Óleos",
      minimum_stock_alert: 25,
      total_quantity: 15,
      is_below_minimum: true,
    },
    {
      item_id: 3,
      item_name: "Feijão Carioca 1kg",
      category_name: "Grãos",
      minimum_stock_alert: 10,
      total_quantity: 3,
      is_below_minimum: true,
    },
  ],
};

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

test.beforeEach(async ({ page }) => {
  await page.route("**/auth/me", (route) => fulfillJson(route, currentUser));
  await page.route("**/dashboard/overview", (route) =>
    fulfillJson(route, dashboard),
  );
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { name: /Olá, Ana/i })).toBeVisible();
});

test("início preserva composição, hierarquia e ausência de overflow", async ({
  page,
}, testInfo) => {
  const viewportWidth = page.viewportSize()?.width ?? 0;
  const metrics = page.locator('[data-testid^="dashboard-metric-"]');
  const panels = page.getByLabel("Prioridades operacionais").locator("article");

  await expect(metrics).toHaveCount(4);
  await expect(panels).toHaveCount(2);
  await expect(page.getByRole("heading", { name: "Ações rápidas" })).toBeVisible();

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(horizontalOverflow).toBe(false);

  const firstMetric = await metrics.nth(0).boundingBox();
  const secondMetric = await metrics.nth(1).boundingBox();
  const fourthMetric = await metrics.nth(3).boundingBox();
  const firstPanel = await panels.nth(0).boundingBox();
  const secondPanel = await panels.nth(1).boundingBox();

  expect(firstMetric).not.toBeNull();
  expect(secondMetric).not.toBeNull();
  expect(fourthMetric).not.toBeNull();
  expect(firstPanel).not.toBeNull();
  expect(secondPanel).not.toBeNull();

  if (viewportWidth > 1180) {
    expect(secondMetric!.x).toBeGreaterThan(firstMetric!.x + firstMetric!.width - 2);
    expect(fourthMetric!.y).toBe(firstMetric!.y);
    expect(secondPanel!.y).toBe(firstPanel!.y);
    expect(secondPanel!.x).toBeGreaterThan(firstPanel!.x + firstPanel!.width - 2);
  } else {
    expect(secondMetric!.x).toBeGreaterThan(firstMetric!.x);
    expect(fourthMetric!.y).toBeGreaterThan(firstMetric!.y);
    expect(secondPanel!.y).toBeGreaterThan(firstPanel!.y + firstPanel!.height - 2);
  }

  await page.screenshot({
    path: testInfo.outputPath(`inicio-${testInfo.project.name}.png`),
    fullPage: viewportWidth >= 900,
  });
});

test("reavaliação comunica aptidão e usa somente dados contratados", async ({ page }) => {
  await expect(page.getByText("Reavaliar 8 famílias")).toBeVisible();
  await expect(
    page.getByText("A decisão final considera o cálculo e o parecer social."),
  ).toBeVisible();
  await expect(page.getByText("Próximo prazo em 25/08/2026 · Apta recorrente")).toBeVisible();
  await expect(page.getByText("Entradas hoje")).toHaveCount(0);
  await expect(page.getByText("Relatório rápido")).toHaveCount(0);
});

test("ações rápidas apontam apenas para rotas reais e autorizadas", async ({ page }) => {
  const quickActions = page.getByLabel("Ações rápidas");

  await expect(quickActions.getByRole("link", { name: "Nova entrada" })).toHaveAttribute(
    "href",
    "/stock-batches/new",
  );
  await expect(quickActions.getByRole("link", { name: "Nova família" })).toHaveAttribute(
    "href",
    "/families/new",
  );
  await expect(quickActions.getByRole("link", { name: "Agendar entrega" })).toHaveAttribute(
    "href",
    "/deliveries/schedules/new",
  );
  await expect(quickActions.getByRole("link", { name: "Tipos de cesta" })).toHaveAttribute(
    "href",
    "/basket-types",
  );
});
