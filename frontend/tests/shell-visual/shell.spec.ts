import path from "node:path";
import { mkdir } from "node:fs/promises";
import { expect, test, type Route } from "@playwright/test";

const finalAuditEvidenceDirectory = path.resolve("showcase/evidence/v2-20");

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
  ],
};

async function fulfillJson(route: Route, body: unknown, headers = {}) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    headers,
    body: JSON.stringify(body),
  });
}

test.beforeEach(async ({ page }) => {
  await page.route("**/auth/me", (route) => fulfillJson(route, currentUser));
  await page.route("**/dashboard/overview", (route) => fulfillJson(route, dashboard));
  await page.route("**/families?**", (route) =>
    fulfillJson(route, [], { "X-Total-Count": "0" }),
  );
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(
    page.getByRole("heading", { name: /Olá, Ana/i }),
  ).toBeVisible();
});

test("shell mantém localização, responsividade e ausência de overflow", async ({
  page,
}, testInfo) => {
  const viewportWidth = page.viewportSize()?.width ?? 0;
  const navigation = page.getByLabel("Navegação principal");
  const activeHome = navigation.getByRole("link", {
    name: "Início",
    exact: true,
    includeHidden: true,
  });

  await expect(activeHome).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("button", { name: "Conta de Ana Silva" })).toBeVisible();

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(horizontalOverflow).toBe(false);

  if (viewportWidth < 900) {
    await expect(navigation).toHaveAttribute("aria-hidden", "true");
    await expect(navigation).toHaveAttribute("inert", "");
    await expect(page.getByRole("navigation", { name: "Atalhos principais" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Abrir menu" })).toBeVisible();
  } else {
    await expect(navigation).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Atalhos principais" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Recolher menu lateral" })).toBeVisible();
  }

  await page.screenshot({
    path: testInfo.outputPath(`shell-${testInfo.project.name}-viewport.png`),
    fullPage: false,
  });
});

test("drawer mobile preserva foco, Escape e bloqueio de rolagem", async ({
  page,
}, testInfo) => {
  test.skip((page.viewportSize()?.width ?? 0) >= 900, "Fluxo exclusivo do shell móvel.");

  const navigation = page.getByLabel("Navegação principal");
  const trigger = page.getByRole("button", { name: "Abrir menu" });
  await trigger.click();

  await expect(navigation).not.toHaveAttribute("aria-hidden");
  await navigation.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished));
  });
  await expect(page.getByRole("button", { name: "Fechar menu" }).first()).toBeFocused();
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");

  await page.screenshot({
    path: testInfo.outputPath(`shell-${testInfo.project.name}-drawer.png`),
    fullPage: false,
  });

  await page.keyboard.press("Escape");
  await expect(navigation).toHaveAttribute("aria-hidden", "true");
  await expect(trigger).toBeFocused();
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
});

test("rota filha mantém a seção correta ativa", async ({ page }) => {
  await page.goto("/families/new");

  const navigation = page.getByLabel("Navegação principal");
  const families = navigation.getByRole("link", {
    name: "Famílias",
    exact: true,
    includeHidden: true,
  });
  await expect(families).toHaveAttribute("aria-current", "page");
  await expect(
    navigation.getByRole("link", { name: "Início", exact: true, includeHidden: true }),
  ).not.toHaveAttribute("aria-current", "page");

  if ((page.viewportSize()?.width ?? 0) < 900) {
    await expect(
      page
        .getByRole("navigation", { name: "Atalhos principais" })
        .getByRole("link", { name: "Famílias", exact: true }),
    ).toHaveAttribute("aria-current", "page");
  }

  await page.goto("/rota-inexistente");
  await expect(navigation.locator('[aria-current="page"]')).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Atalhos principais" }).locator('[aria-current="page"]'),
  ).toHaveCount(0);
});

test("estados de sistema não reutilizam a identidade visual legada", async ({
  page,
}, testInfo) => {
  test.skip(
    !["mobile-390", "desktop-1440"].includes(testInfo.project.name),
    "Evidência final concentrada nos dois viewports de aprovação.",
  );

  await mkdir(finalAuditEvidenceDirectory, { recursive: true });
  await page.goto("/rota-inexistente");
  await expect(
    page.getByRole("heading", { level: 1, name: "Este caminho não existe" }),
  ).toBeVisible();
  await expect(page.locator(".hero-card, .panel-card")).toHaveCount(0);
  await page.screenshot({
    path: path.join(
      finalAuditEvidenceDirectory,
      `pagina-nao-encontrada-${testInfo.project.name}.png`,
    ),
    fullPage: true,
  });

  await page.unroute("**/auth/me");
  await page.route("**/auth/me", (route) =>
    fulfillJson(route, {
      ...currentUser,
      roles: ["operador"],
    }),
  );
  await page.goto("/users");
  await expect(
    page.getByRole("heading", { level: 1, name: "Acesso restrito" }),
  ).toBeVisible();
  await expect(page.locator(".hero-card, .panel-card")).toHaveCount(0);
  await page.screenshot({
    path: path.join(
      finalAuditEvidenceDirectory,
      `acesso-restrito-${testInfo.project.name}.png`,
    ),
    fullPage: true,
  });
});
