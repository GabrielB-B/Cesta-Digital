import path from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const evidenceDirectory = path.resolve("showcase/evidence/v2-13");

const currentUser = {
  id: 1,
  name: "Ana Silva",
  login_name: "ana.silva",
  email: "ana.silva@cestadigital.org",
  is_active: true,
  roles: ["admin"],
};

const roles = [
  { id: 1, name: "admin", description: "Acesso administrativo completo." },
  { id: 2, name: "lider_social", description: "Atendimento e avaliação social." },
  { id: 3, name: "operador", description: "Operação logística e de estoque." },
];

const users = [
  { id: 1, name: "Ana Silva", login_name: "ana.silva", email: "ana.silva@cestadigital.org", is_active: true, roles: ["admin"], last_login_at: "2026-08-27T08:42:00", created_at: "2025-01-10T10:00:00", updated_at: "2026-08-27T08:42:00" },
  { id: 2, name: "Carlos Mendes", login_name: "carlos.mendes", email: "carlos.mendes@cestadigital.org", is_active: true, roles: ["lider_social"], last_login_at: "2026-08-27T07:15:00", created_at: "2025-02-11T10:00:00", updated_at: "2026-08-27T07:15:00" },
  { id: 3, name: "Juliana Costa", login_name: "juliana.costa", email: "juliana.costa@cestadigital.org", is_active: true, roles: ["operador"], last_login_at: "2026-08-26T16:30:00", created_at: "2025-03-12T10:00:00", updated_at: "2026-08-26T16:30:00" },
  { id: 4, name: "Rafael Oliveira", login_name: "rafael.oliveira", email: "rafael.oliveira@cestadigital.org", is_active: true, roles: ["operador"], last_login_at: "2026-08-26T14:22:00", created_at: "2025-04-13T10:00:00", updated_at: "2026-08-26T14:22:00" },
  { id: 5, name: "Beatriz Lima", login_name: "beatriz.lima", email: "beatriz.lima@cestadigital.org", is_active: false, roles: ["lider_social"], last_login_at: "2026-08-22T09:12:00", created_at: "2025-05-14T10:00:00", updated_at: "2026-08-22T09:12:00" },
  { id: 6, name: "Fernando Souza", login_name: "fernando.souza", email: "fernando.souza@cestadigital.org", is_active: true, roles: ["admin", "lider_social"], last_login_at: null, created_at: "2026-08-20T10:00:00", updated_at: "2026-08-20T10:00:00" },
];

const auditLogs = [
  { id: 1, event_type: "auth.login_succeeded", entity_type: "user", entity_id: "1", actor_user_id: 1, actor_email: "ana.silva@cestadigital.org", request_id: "req-1001", ip_address: "192.168.1.21", details: { roles: ["admin"] }, created_at: "2026-08-27T08:42:00" },
  { id: 2, event_type: "user.updated", entity_type: "user", entity_id: "5", actor_user_id: 1, actor_email: "ana.silva@cestadigital.org", request_id: "req-1002", ip_address: "192.168.1.21", details: { name: "Beatriz Lima", status: "Inativo" }, created_at: "2026-08-27T08:31:00" },
  { id: 3, event_type: "auth.login_failed", entity_type: "user", entity_id: null, actor_user_id: null, actor_email: "acesso@cestadigital.org", request_id: "req-1003", ip_address: "192.168.1.48", details: { reason: "Credencial inválida" }, created_at: "2026-08-27T08:12:00" },
  { id: 4, event_type: "item.created", entity_type: "item", entity_id: "128", actor_user_id: 3, actor_email: "juliana.costa@cestadigital.org", request_id: "req-1004", ip_address: "192.168.1.32", details: { item_name: "Leite Integral 1L" }, created_at: "2026-08-27T07:58:00" },
  { id: 5, event_type: "family.status_updated", entity_type: "family", entity_id: "1248", actor_user_id: 2, actor_email: "carlos.mendes@cestadigital.org", request_id: "req-1005", ip_address: "192.168.1.25", details: { from_status: "Em avaliação", to_status: "Apta" }, created_at: "2026-08-26T17:20:00" },
  { id: 6, event_type: "user.password_reset", entity_type: "user", entity_id: "4", actor_user_id: 1, actor_email: "ana.silva@cestadigital.org", request_id: "req-1006", ip_address: "192.168.1.21", details: { login_name: "rafael.oliveira" }, created_at: "2026-08-26T16:05:00" },
];

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function mockApi(page: Page) {
  await page.route("**/auth/me", (route) => fulfillJson(route, currentUser));
  await page.route("**/users/roles", (route) => fulfillJson(route, roles));
  await page.route(/\/users\/\d+\/password$/, (route) => fulfillJson(route, { message: "Senha atualizada" }));
  await page.route(/\/users\/\d+$/, (route) => fulfillJson(route, users[0]));
  await page.route("**/users", async (route) => {
    if (route.request().resourceType() === "document") {
      await route.fallback();
      return;
    }
    await fulfillJson(route, route.request().method() === "GET" ? users : users[0], route.request().method() === "GET" ? 200 : 201);
  });
  await page.route("**/audit-logs/export**", (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "id,event_type\n1,auth.login_succeeded\n" }));
  await page.route("**/audit-logs?**", (route) => fulfillJson(route, { total: auditLogs.length, limit: 25, offset: 0, items: auditLogs }));
}

test.beforeEach(async ({ page }) => { await mockApi(page); });

test("usuários mantém hierarquia e adaptação responsiva", async ({ page }, testInfo) => {
  await page.goto("/users");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { name: "Administração", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Usuários", exact: true })).toBeVisible();
  const viewportWidth = page.viewportSize()?.width ?? 0;
  const userSurface = viewportWidth >= 900
    ? page.getByRole("table", { name: "Usuários e perfis cadastrados" })
    : page.getByRole("article").filter({ hasText: "Ana Silva" });
  await expect(userSurface.getByText("Ana Silva", { exact: true })).toBeVisible();
  await expect(page.locator('aside a[href="/users"]').first()).toHaveAttribute("aria-current", "page");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: path.join(evidenceDirectory, `administracao-usuarios-${testInfo.project.name}.png`), fullPage: true });
});

test("perfis explicam permissões reais", async ({ page }, testInfo) => {
  test.skip(!["tablet-768", "desktop-1440"].includes(testInfo.project.name), "Evidência nos viewports de comparação.");
  await page.goto("/users?view=roles");
  await expect(page.getByRole("heading", { name: "Perfis de acesso" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Administrador", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Operador", exact: true })).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDirectory, `administracao-perfis-${testInfo.project.name}.png`), fullPage: true });
});

test("cadastro de usuário abre formulário funcional", async ({ page }, testInfo) => {
  test.skip(!["mobile-390", "desktop-1440"].includes(testInfo.project.name), "Interação nos viewports principais.");
  await page.goto("/users");
  await page.getByRole("button", { name: "Novo usuário" }).click();
  const dialog = page.getByRole("dialog", { name: "Novo usuário" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Nome completo")).toBeVisible();
  await expect(dialog.getByText("Perfis de acesso", { exact: true })).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDirectory, `administracao-cadastro-${testInfo.project.name}.png`), fullPage: true });
});

test("auditoria preserva leitura humana e detalhes técnicos sob demanda", async ({ page }, testInfo) => {
  test.skip(!["mobile-390", "desktop-1440"].includes(testInfo.project.name), "Evidência nos viewports principais.");
  await page.goto("/audit-logs");
  await expect(page.getByRole("heading", { name: "Auditoria do sistema" })).toBeVisible();
  const viewportWidth = page.viewportSize()?.width ?? 0;
  const auditSurface = viewportWidth >= 900
    ? page.getByRole("table", { name: "Eventos recentes da auditoria do sistema" })
    : page.getByRole("article").filter({ hasText: "Login realizado" });
  await expect(auditSurface.getByText("Login realizado", { exact: true })).toBeVisible();
  await auditSurface.getByRole("button", { name: "Ver detalhes" }).first().click();
  await expect(page.getByRole("dialog", { name: "Login realizado" })).toBeVisible();
  await expect(page.getByText("Código do evento")).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDirectory, `administracao-auditoria-${testInfo.project.name}.png`), fullPage: true });
});
