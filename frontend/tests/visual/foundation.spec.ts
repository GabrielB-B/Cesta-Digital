import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/showcase/");
  await page.evaluate(() => document.fonts.ready);
});

test("renderiza a fundação sem overflow e com navegação responsiva", async ({
  page,
}, testInfo) => {
  await expect(page.getByRole("heading", { name: "Visão geral da operação" })).toBeVisible();
  await expect(page.getByText("Famílias ativas")).toBeVisible();

  const viewportWidth = page.viewportSize()?.width ?? 0;
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(horizontalOverflow).toBe(false);

  if (viewportWidth < 900) {
    await expect(
      page.getByRole("navigation", { name: "Navegação principal móvel", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Navegação principal", exact: true }),
    ).toBeHidden();
  } else {
    await expect(
      page.getByRole("navigation", { name: "Navegação principal", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Navegação principal móvel", exact: true }),
    ).toBeHidden();
  }

  if (viewportWidth < 680) {
    await expect(page.getByRole("list", { name: "Atendimentos sociais recentes" })).toBeVisible();
    await expect(page.getByRole("table", { name: "Atendimentos sociais recentes" })).toBeHidden();
  } else {
    await expect(page.getByRole("table", { name: "Atendimentos sociais recentes" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Atendimentos sociais recentes" })).toBeHidden();
  }

  await page.screenshot({
    path: testInfo.outputPath(`foundation-${testInfo.project.name}-viewport.png`),
    fullPage: false,
  });
  await page.screenshot({
    path: testInfo.outputPath(`foundation-${testInfo.project.name}-full.png`),
    fullPage: true,
  });
});

test("drawer preserva foco, teclado e bloqueio de rolagem", async ({ page }, testInfo) => {
  const trigger = page.getByRole("button", { name: "Novo atendimento" });
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: "Novo atendimento" });
  await expect(dialog).toBeVisible();
  await dialog.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished));
  });
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await expect(page.getByRole("button", { name: "Fechar painel" })).toBeFocused();

  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Continuar" })).toBeFocused();

  await page.screenshot({
    path: testInfo.outputPath(`drawer-${testInfo.project.name}.png`),
    fullPage: false,
  });

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
});

test("navegação atualiza localização e mantém cada domínio no seu contexto", async ({
  page,
}, testInfo) => {
  const stockLink = page.getByRole("link", { name: "Estoque", exact: true });
  await stockLink.click();

  await expect(page.getByRole("heading", { name: "Estoque", exact: true })).toBeVisible();
  await expect(stockLink).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Alimentos, higiene e itens essenciais")).toBeVisible();
  await expect(page.getByText("Família de Ana Souza")).toBeHidden();
  await expect(page).toHaveURL(/#estoque$/);

  await page.screenshot({
    path: testInfo.outputPath(`stock-${testInfo.project.name}-viewport.png`),
    fullPage: false,
  });

  const deliveriesLink = page.getByRole("link", { name: "Entregas", exact: true });
  await deliveriesLink.click();
  await expect(page.getByRole("heading", { name: "Entregas", exact: true })).toBeVisible();
  await expect(deliveriesLink).toHaveAttribute("aria-current", "page");

  await page.getByRole("link", { name: "Visão geral", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral da operação" })).toBeVisible();
});
