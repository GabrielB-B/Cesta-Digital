import { expect, test, type Route } from "@playwright/test";

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

test.beforeEach(async ({ page }) => {
  await page.route("**/auth/me", (route) =>
    fulfillJson(route, { detail: "Não autenticado" }, 401),
  );
  await page.route("**/auth/password-recovery", (route) =>
    fulfillJson(route, {
      message: "Se o e-mail estiver cadastrado, a equipe poderá redefinir sua senha.",
    }),
  );

  await page.goto("/login");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { name: "Bem-vindo de volta!" })).toBeVisible();
});

test("login preserva composição, escala de marca e ausência de overflow", async ({
  page,
}, testInfo) => {
  const viewportWidth = page.viewportSize()?.width ?? 0;
  const symbol = page.getByRole("img", { name: "Símbolo da Cesta Digital" });
  const brandRegion = page.getByRole("region", { name: "Apresentação Cesta Digital" });
  const accessRegion = page.getByRole("region", { name: "Acesso ao Cesta Digital" });

  await expect(symbol).toBeVisible();
  await expect(page.getByLabel("Nome de login")).toBeVisible();
  await expect(page.getByLabel("Senha", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(horizontalOverflow).toBe(false);

  const symbolBox = await symbol.boundingBox();
  const brandBox = await brandRegion.boundingBox();
  const accessBox = await accessRegion.boundingBox();

  expect(symbolBox).not.toBeNull();
  expect(brandBox).not.toBeNull();
  expect(accessBox).not.toBeNull();

  if (viewportWidth >= 900) {
    expect(symbolBox!.width).toBeGreaterThanOrEqual(138);
    expect(brandBox!.width / viewportWidth).toBeGreaterThan(0.42);
    expect(brandBox!.width / viewportWidth).toBeLessThan(0.45);
    expect(accessBox!.x).toBeGreaterThanOrEqual(brandBox!.width - 1);
  } else {
    expect(symbolBox!.width).toBeGreaterThanOrEqual(64);
    expect(brandBox!.height).toBeLessThan(170);
    expect(accessBox!.y).toBeGreaterThanOrEqual(brandBox!.height - 1);
  }

  await page.screenshot({
    path: testInfo.outputPath(`login-${testInfo.project.name}.png`),
    fullPage: false,
  });
});

test("senha pode ser exibida e ocultada com controle acessível", async ({ page }) => {
  const password = page.getByLabel("Senha", { exact: true });

  await password.fill("senha-segura");
  await page.getByRole("button", { name: "Mostrar senha" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(page.getByRole("button", { name: "Ocultar senha" })).toBeFocused();

  await page.getByRole("button", { name: "Ocultar senha" }).click();
  await expect(password).toHaveAttribute("type", "password");
});

test("recuperação abre com foco, mantém contrato e não causa overflow", async ({
  page,
}, testInfo) => {
  const recoveryTrigger = page.getByRole("button", { name: "Esqueci minha senha" });

  await recoveryTrigger.click();
  await expect(recoveryTrigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByLabel("E-mail de recuperação")).toBeFocused();

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(horizontalOverflow).toBe(false);

  await page.getByLabel("E-mail de recuperação").fill("ana@cestadigital.org");
  await page.getByRole("button", { name: "Solicitar recuperação" }).click();
  await expect(
    page.getByText("Se o e-mail estiver cadastrado, a equipe poderá redefinir sua senha."),
  ).toBeVisible();

  await page.screenshot({
    path: testInfo.outputPath(`login-${testInfo.project.name}-recovery.png`),
    fullPage: true,
  });
});
