import { expect, type Page, type Route, test } from "@playwright/test";

const currentUser = {
  id: 1,
  name: "Admin Homologacao",
  login_name: "admin",
  email: "admin@cestadigital.app",
  is_active: true,
  roles: ["admin", "lider_social", "operador"],
};

const family = {
  id: 1,
  internal_code: "FAM-0001",
  status: "apta_recorrente",
  registration_date: "2026-05-01",
  last_evaluation_date: null,
  next_revaluation_date: "2026-08-01",
  monthly_income_total: "600.00",
  monthly_essential_expenses: "300.00",
  income_per_capita: "200.00",
  receives_government_assistance: true,
  housing_type: "cedida",
  has_water_supply: true,
  has_electricity: true,
  has_sanitation: true,
  rooms_count: 3,
  bedrooms_count: 2,
  zip_code: "49000-000",
  street: "Rua A",
  number: "10",
  complement: null,
  neighborhood: "Centro",
  city: "Aracaju",
  state: "SE",
  reference_point: null,
  total_residents: 3,
  total_adults: 1,
  total_children: 2,
  total_elderly: 0,
  total_babies: 0,
  has_pregnant_member: false,
  has_disabled_member: false,
  has_chronic_illness_member: false,
  has_unemployed_member: true,
  needs_extra_support: false,
  attends_church: false,
  church_name: null,
  community_relationship: null,
  responsible_education_level: null,
  has_internet_access: true,
  has_mobile_phone: true,
  has_computer: false,
  social_notes: null,
  internal_notes: null,
  contacts: [
    {
      id: 1,
      contact_name: "Maria Silva",
      phone: "79999990000",
      contact_type: "principal",
      is_whatsapp: true,
      notes: null,
    },
  ],
};

const item = {
  item_id: 1,
  item_name: "Arroz 1kg",
  category_id: 1,
  category_name: "alimentos",
  unit_measure: "un",
  tracks_expiration: true,
  is_active: true,
  minimum_stock_alert: 10,
  total_quantity: 8,
  total_batches: 2,
  is_below_minimum: true,
};

const basketType = {
  id: 1,
  name: "Cesta padrao",
  is_active: true,
  notes: null,
};

const schedule = {
  id: 1,
  family_id: 1,
  basket_type_id: 1,
  scheduled_date: "2026-05-15",
  status: "agendado",
  notes: "Retirada pela manha",
  created_by_user_id: 1,
};

const delivery = {
  id: 1,
  delivery_schedule_id: 1,
  family_id: 1,
  basket_type_id: 1,
  delivery_date: "2026-05-10T10:00:00",
  delivered_by_user_id: 1,
  status: "concluida",
  notes: "Entrega anterior",
};

async function fulfillJson(route: Route, body: unknown, headers = {}) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    headers,
    body: JSON.stringify(body),
  });
}

async function mockApi(page: Page) {
  await page.route("**/auth/me", async (route) => fulfillJson(route, currentUser));
  await page.route("**/auth/login", async (route) => fulfillJson(route, {
    access_token: "test-token",
    token_type: "bearer",
    user_id: currentUser.id,
    name: currentUser.name,
    login_name: currentUser.login_name,
    email: currentUser.email,
    roles: currentUser.roles,
  }));
  await page.route("**/auth/logout", async (route) => {
    await route.fulfill({ status: 204 });
  });
  await page.route("**/auth/password-recovery", async (route) =>
    fulfillJson(route, {
      message: "Se o email estiver cadastrado, a equipe podera redefinir sua senha.",
    })
  );
  await page.route("**/dashboard/overview", async (route) => fulfillJson(route, {
    total_families: 1,
    active_families: 1,
    recurring_eligible_families: 1,
    emergency_eligible_families: 0,
    under_review_families: 0,
    inactive_families: 0,
    pending_schedules: 1,
    deliveries_this_month: 1,
    upcoming_revaluations_count: 1,
    items_below_minimum_count: 1,
    basket_summaries: [
      {
        basket_type_id: 1,
        basket_type_name: basketType.name,
        possible_baskets: 8,
      },
    ],
    upcoming_revaluations: [
      {
        family_id: family.id,
        internal_code: family.internal_code,
        status: family.status,
        next_revaluation_date: family.next_revaluation_date,
      },
    ],
    stock_alerts: [
      {
        item_id: item.item_id,
        item_name: item.item_name,
        category_name: item.category_name,
        minimum_stock_alert: item.minimum_stock_alert,
        total_quantity: item.total_quantity,
        is_below_minimum: item.is_below_minimum,
      },
    ],
  }));
  await page.route("**/families?**", async (route) =>
    fulfillJson(route, [family], { "X-Total-Count": "1" })
  );
  await page.route("**/stock-summary?**", async (route) =>
    fulfillJson(route, [item], { "X-Total-Count": "1" })
  );
  await page.route("**/basket-types?**", async (route) =>
    fulfillJson(route, [basketType], { "X-Total-Count": "1" })
  );
  await page.route("**/delivery-schedules?**", async (route) =>
    fulfillJson(route, [schedule], { "X-Total-Count": "1" })
  );
  await page.route("**/deliveries?**", async (route) =>
    fulfillJson(route, [delivery], { "X-Total-Count": "1" })
  );
  await page.route("**/deliveries/from-schedule/**", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ ...delivery, id: 2 }),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test("login, dashboard and core operational routes render", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Nome de login").fill("admin");
  await page.getByLabel("Senha").fill("Admin@123456");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByRole("heading", { name: /Dashboard do Cesta Digital/i })).toBeVisible();
  await expect(
    page.locator("#conteudo-principal").getByText("Admin Homologacao")
  ).toBeVisible();

  const mainNav = page.getByLabel("Navegacao principal");

  await mainNav.getByRole("link", { name: /Familias/i }).click();
  await expect(page.getByRole("heading", { name: "Familias", exact: true })).toBeVisible();
  await expect(page.getByText("FAM-0001")).toBeVisible();

  await mainNav.getByRole("link", { name: /^Itens$/i }).click();
  await expect(page.getByRole("heading", { name: "Itens", exact: true })).toBeVisible();
  await expect(page.getByText("Arroz 1kg")).toBeVisible();

  await mainNav.getByRole("link", { name: /Entregas/i }).click();
  await expect(page.getByRole("heading", { name: "Agendamentos e entregas" })).toBeVisible();
  await expect(page.getByLabel(/Observacao do agendamento/i)).toHaveValue(
    "Retirada pela manha"
  );
});

test("delivery confirmation shows success feedback", async ({ page }) => {
  await page.goto("/deliveries");

  await page.getByRole("button", { name: "Confirmar" }).click();

  await expect(
    page.getByText("Entrega confirmada e estoque baixado automaticamente.")
  ).toBeVisible();
});

test("mobile shell opens drawer navigation and compact account menu", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");

  await page.getByLabel("Nome de login").fill("admin");
  await page.getByLabel("Senha").fill("Admin@123456");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByRole("heading", { name: /Dashboard do Cesta Digital/i })).toBeVisible();

  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page
    .getByLabel("Navegacao principal")
    .getByRole("link", { name: /Familias/i })
    .click();

  await expect(page.getByRole("heading", { name: "Familias", exact: true })).toBeVisible();

  await page.getByRole("button", { name: /Conta de Admin Homologacao/i }).click();
  await expect(page.getByRole("menuitem", { name: "Sair" })).toBeVisible();
});

test("password recovery request shows safe feedback", async ({ page }) => {
  await page.goto("/login");

  await page.getByRole("button", { name: "Esqueci minha senha" }).click();
  await page.getByLabel("Email de recuperacao").fill("admin@cestadigital.app");
  await page.getByRole("button", { name: "Solicitar recuperacao" }).click();

  await expect(
    page.getByText("Se o email estiver cadastrado, a equipe podera redefinir sua senha.")
  ).toBeVisible();
});
