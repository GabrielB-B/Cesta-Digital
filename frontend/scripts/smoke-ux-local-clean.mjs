import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const accessFile = fileURLToPath(
  new URL("../../.ux-sandbox/access.json", import.meta.url),
);
const access = JSON.parse(await readFile(accessFile, "utf8"));
const baseURL = (process.env.UX_FRONTEND_URL ?? "http://127.0.0.1:5173").replace(
  /\/$/,
  "",
);

const routes = [
  "/",
  "/families",
  "/assessments",
  "/items",
  "/stock-batches",
  "/item-categories",
  "/deliveries",
  "/basket-types",
  "/reports",
  "/users",
  "/audit-logs",
];

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

const browser = await chromium.launch({ headless: true });
const failures = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });
    const page = await context.newPage();
    const runtimeErrors = [];

    page.on("pageerror", (error) => {
      runtimeErrors.push(`JavaScript: ${error.message}`);
    });
    page.on("response", (response) => {
      if (response.status() >= 500) {
        runtimeErrors.push(`HTTP ${response.status()}: ${response.url()}`);
      }
    });

    await page.goto(`${baseURL}/login`, { waitUntil: "domcontentloaded" });
    await page.getByLabel("Nome de login").fill(access.login_name);
    await page.getByLabel("Senha", { exact: true }).fill(access.password);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.waitForURL(`${baseURL}/`, { timeout: 15_000 });
    await page.getByRole("button", { name: /Conta de Administrador UX/i }).waitFor();

    for (const route of routes) {
      const errorsBeforeRoute = runtimeErrors.length;
      const response = await page.goto(`${baseURL}${route}`, {
        waitUntil: "domcontentloaded",
      });

      await page.locator("#conteudo-principal").waitFor();
      await page.locator("h1").first().waitFor();
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});

      const currentPath = new URL(page.url()).pathname;
      const metrics = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));

      if (!response || response.status() >= 400) {
        failures.push(
          `${viewport.name} ${route}: documento retornou ${response?.status() ?? "sem resposta"}`,
        );
      }
      if (currentPath !== route) {
        failures.push(`${viewport.name} ${route}: redirecionou para ${currentPath}`);
      }
      if (metrics.scrollWidth > metrics.clientWidth + 2) {
        failures.push(
          `${viewport.name} ${route}: overflow horizontal de ${metrics.scrollWidth - metrics.clientWidth}px`,
        );
      }
      for (const error of runtimeErrors.slice(errorsBeforeRoute)) {
        failures.push(`${viewport.name} ${route}: ${error}`);
      }
    }

    await context.close();
  }
} finally {
  await browser.close();
}

if (failures.length > 0) {
  console.error("Smoke test do sandbox limpo encontrou falhas:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Smoke test aprovado: ${routes.length} rotas em desktop e mobile, sem erro 5xx, exceção ou overflow horizontal.`,
  );
}
