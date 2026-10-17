import path from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const evidenceDirectory = path.resolve("showcase/evidence/v2-12");

const currentUser = {
  id: 1,
  name: "Ana Silva",
  login_name: "ana.silva",
  email: "ana.silva@cestadigital.org",
  is_active: true,
  roles: ["admin"],
};

const reportsOverview = {
  start_date: "2026-08-01",
  end_date: "2026-08-26",
  generated_at: "2026-08-26T10:30:00",
  kpis: { families_served: 1248, baskets_delivered: 342, items_distributed: 7856 },
  available_reports: [
    { key: "attendances", title: "Atendimentos por período", description: "Famílias atendidas e recorrência de entregas no período.", format: "csv", uses_period: true },
    { key: "deliveries", title: "Cestas entregues", description: "Entregas concluídas por data, família e tipo de cesta.", format: "csv", uses_period: true },
    { key: "stock_movements", title: "Estoque movimentado", description: "Entradas, saídas, perdas e ajustes registrados no período.", format: "csv", uses_period: true },
    { key: "benefits", title: "Benefícios concedidos", description: "Benefícios iniciados no período, com valor e situação.", format: "csv", uses_period: true },
    { key: "families", title: "Famílias cadastradas", description: "Cadastros realizados no período, por situação e região.", format: "csv", uses_period: true },
    { key: "stock_alerts", title: "Alertas de estoque", description: "Posição atual dos itens abaixo do estoque mínimo.", format: "csv", uses_period: false },
  ],
};

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
}

async function mockApi(page: Page) {
  await page.route("**/auth/me", (route) => fulfillJson(route, currentUser));
  await page.route("**/reports/overview?**", (route) => fulfillJson(route, reportsOverview));
  await page.route("**/reports/*/export?**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/csv; charset=utf-8",
      body: "codigo;quantidade\nFAM-01248;1\n",
    }),
  );
}

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test("relatórios segue a referência com indicadores e downloads reais", async ({ page }, testInfo) => {
  await page.goto("/reports?start_date=2026-08-01&end_date=2026-08-26");
  await page.evaluate(() => document.fonts.ready);

  await expect(page.getByRole("heading", { name: "Relatórios", exact: true })).toBeVisible();
  await expect(page.getByText("1.248")).toBeVisible();
  await expect(page.getByText("7.856")).toBeVisible();
  await expect(page.getByRole("button", { name: /Baixar Atendimentos por período/ })).toBeVisible();
  await expect(page.getByText(/CSV UTF-8/)).toBeVisible();

  const viewportWidth = page.viewportSize()?.width ?? 0;
  if (viewportWidth >= 900) {
    await expect(
      page.getByLabel("Navegação principal").getByRole("link", { name: "Relatórios" }),
    ).toHaveAttribute("aria-current", "page");
  } else {
    await expect(
      page.getByLabel("Atalhos principais").getByRole("link", { name: "Relatórios" }),
    ).toHaveAttribute("aria-current", "page");
  }

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: path.join(evidenceDirectory, `relatorios-${testInfo.project.name}.png`),
    fullPage: true,
  });
});

test("filtro e download mantêm o relatório selecionado", async ({ page }, testInfo) => {
  test.skip(
    !["mobile-390", "desktop-1440"].includes(testInfo.project.name),
    "Interação concentrada nos viewports principais de aprovação.",
  );
  await page.goto("/reports?start_date=2026-08-01&end_date=2026-08-26");
  await page.getByLabel("Tipo de relatório").selectOption("stock_alerts");
  const reportsPanel = page.locator('section[aria-labelledby="available-reports-title"]');
  await expect(reportsPanel.getByText("Alertas de estoque", { exact: true })).toBeVisible();
  await expect(reportsPanel.getByText("Cestas entregues", { exact: true })).toHaveCount(0);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Baixar Alertas de estoque/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("stock_alerts-2026-08-01-2026-08-26.csv");
});
