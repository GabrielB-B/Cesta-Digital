import { expect, type Page, type Route, test } from "@playwright/test";

const currentUser = {
  id: 1,
  name: "Admin Homologacao",
  login_name: "admin",
  email: "admin@cestadigital.app",
  is_active: true,
  roles: ["admin", "lider_social", "operador"],
};

const operatorUser = {
  id: 2,
  name: "Operador Homologacao",
  login_name: "operador",
  email: "operador@cestadigital.app",
  is_active: true,
  roles: ["operador"],
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

const familyDetail = {
  ...family,
  people: [
    {
      id: 1,
      full_name: "Maria Silva",
      birth_date: "1988-05-10",
      kinship: "responsavel",
      gender: "feminino",
      phone: "79999990000",
      education_level: "medio",
      is_currently_studying: false,
      is_currently_working: true,
      occupation: "Autonoma",
      individual_income: "600.00",
      attends_church: true,
      church_name: "UPG Central",
      church_role: "Voluntaria",
      has_disability: false,
      has_chronic_illness: false,
      is_pregnant: false,
      is_nursing_mother: false,
      notes: null,
      is_family_responsible: true,
    },
  ],
  benefits: [],
  assessments: [
    {
      id: 1,
      assessment_date: "2026-05-15",
      monthly_income_total_at_time: "600.00",
      income_per_capita_at_time: "200.00",
      vulnerability_score: 4,
      system_suggestion: "apta_recorrente",
      final_decision: "apta_recorrente",
      decision_reason: "Dentro do criterio social.",
      exception_reason: null,
      approved_by_user_id: 1,
      co_approved_by_user_id: null,
      next_revaluation_date: "2026-08-15",
      technical_notes: null,
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

const users = [
  {
    ...currentUser,
    last_login_at: "2026-05-10T09:00:00",
    created_at: "2026-05-01T08:00:00",
    updated_at: "2026-05-01T08:00:00",
  },
  {
    ...operatorUser,
    last_login_at: null,
    created_at: "2026-05-01T08:00:00",
    updated_at: "2026-05-01T08:00:00",
  },
];

const roleOptions = [
  { id: 1, name: "admin", description: "Administrador" },
  { id: 2, name: "lider_social", description: "Lideranca social" },
  { id: 3, name: "operador", description: "Operador" },
];

const auditLogs = [
  {
    id: 1,
    event_type: "auth.login_succeeded",
    entity_type: "user",
    entity_id: "1",
    actor_user_id: 1,
    actor_email: "admin@cestadigital.app",
    request_id: "c543188e-0000-4000-9000-1111111127ff",
    ip_address: "127.0.0.1",
    details: { roles: ["admin"], login_name: "admin" },
    created_at: "2026-05-30T03:51:00",
  },
  {
    id: 2,
    event_type: "auth.login_failed",
    entity_type: "user",
    entity_id: "2",
    actor_user_id: null,
    actor_email: "operador@cestadigital.app",
    request_id: "d621188e-0000-4000-9000-2222222238aa",
    ip_address: "127.0.0.1",
    details: { reason: "invalid_password", login_name: "operador" },
    created_at: "2026-05-30T03:50:00",
  },
];

async function fulfillJson(route: Route, body: unknown, headers = {}) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    headers,
    body: JSON.stringify(body),
  });
}

async function mockApi(page: Page, user = currentUser) {
  await page.route("**/auth/me", async (route) => fulfillJson(route, user));
  await page.route("**/auth/login", async (route) => fulfillJson(route, {
    access_token: "test-token",
    token_type: "bearer",
    user_id: user.id,
    name: user.name,
    login_name: user.login_name,
    email: user.email,
    roles: user.roles,
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
  await page.route("**/families/*/eligibility-preview", async (route) =>
    fulfillJson(route, {
      family_id: family.id,
      internal_code: family.internal_code,
      income_per_capita: family.income_per_capita,
      extreme_poverty_limit: "109.00",
      poverty_limit: "218.00",
      system_suggestion: "apta_recorrente",
      poverty_band: "extrema_pobreza",
      economic_reason: "Renda per capita dentro da faixa de extrema pobreza.",
      social_weight_score: 4,
      social_aggravating_factors: ["2 crianca(s) (+2)", "Ha desemprego na familia (+2)"],
      priority_level: "media",
    })
  );
  await page.route("**/families/*", async (route) => {
    if (route.request().resourceType() === "document") {
      await route.fallback();
      return;
    }

    if (route.request().method() === "GET") {
      await fulfillJson(route, familyDetail);
      return;
    }

    await route.fallback();
  });
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
  await page.route("**/users/roles", async (route) =>
    fulfillJson(route, roleOptions)
  );
  await page.route("**/users", async (route) => {
    if (route.request().resourceType() === "document") {
      await route.fallback();
      return;
    }

    if (route.request().method() === "GET") {
      await fulfillJson(route, users);
      return;
    }

    await fulfillJson(route, users[0]);
  });
  await page.route("**/audit-logs/export**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/csv",
      body: "id,event_type\n1,auth.login_succeeded\n",
    });
  });
  await page.route("**/audit-logs?**", async (route) =>
    fulfillJson(route, {
      total: auditLogs.length,
      limit: 25,
      offset: 0,
      items: auditLogs,
    })
  );
}

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

async function expectLoginBrandSeparated(page: Page) {
  const brand = page
    .locator(".login-page .brand-lockup--login:visible")
    .filter({ hasText: "Cesta Digital" })
    .first();
  const mark = brand.locator(".brand-lockup__mark");
  const title = brand.locator(".brand-lockup__title");

  await expect(mark).toBeVisible();
  await expect(title).toHaveText("Cesta Digital");

  const markBox = await mark.boundingBox();
  const titleBox = await title.boundingBox();

  expect(markBox).not.toBeNull();
  expect(titleBox).not.toBeNull();
  expect(markBox!.y + markBox!.height).toBeLessThanOrEqual(titleBox!.y - 4);
}

test("login brand and loading remain polished on desktop and mobile", async ({ page }) => {
  await page.setViewportSize({ width: 1365, height: 768 });
  await page.goto("/login");
  await expectLoginBrandSeparated(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expectLoginBrandSeparated(page);

  await page.getByLabel("Nome de login").fill("admin");
  await page.getByLabel("Senha").fill("Admin@123456");
  await page.getByRole("button", { name: "Entrar" }).click();

  const successOverlay = page.locator(".login-success-overlay");
  const mobileSplashMark = successOverlay.locator(".brand-lockup--mark-only");
  await expect(mobileSplashMark).toBeVisible();
  const mobileSplashBox = await mobileSplashMark.boundingBox();
  expect(mobileSplashBox?.width ?? 0).toBeGreaterThanOrEqual(96);
  await page.waitForTimeout(3400);
  await expect(successOverlay).toBeVisible();
  await expect(page.getByRole("heading", { name: /Dashboard do Cesta Digital/i })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /Dashboard do Cesta Digital/i })).toBeVisible();
});

test("failed login keeps the user on login without success splash", async ({ page }) => {
  await page.unroute("**/auth/login");
  await page.route("**/auth/login", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Credenciais invalidas." }),
    });
  });

  await page.goto("/login");
  await page.getByLabel("Nome de login").fill("admin");
  await page.getByLabel("Senha").fill("senha-errada");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByText("Credenciais invalidas.")).toBeVisible();
  await expect(page.locator(".login-success-overlay")).toHaveCount(0);
  await expect(page.getByLabel("Nome de login")).toBeVisible();
});

test("auth loading uses the brand symbol on desktop and mobile", async ({ page }) => {
  await page.unroute("**/auth/me");
  await page.route("**/auth/me", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 350));
    await fulfillJson(route, currentUser);
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  await expect(page.locator(".app-loading .brand-lockup--mark-only")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Dashboard do Cesta Digital/i })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();

  await expect(page.locator(".app-loading .brand-lockup--mark-only")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Dashboard do Cesta Digital/i })).toBeVisible();
});

test("login, dashboard and core operational routes render", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Nome de login").fill("admin");
  await page.getByLabel("Senha").fill("Admin@123456");
  await page.getByRole("button", { name: "Entrar" }).click();

  const desktopSuccessOverlay = page.locator(".login-success-overlay");
  await expect(desktopSuccessOverlay).toHaveClass(/login-success-overlay--video/);
  await expect(page.locator(".login-success-overlay__video")).toHaveCount(1);
  await expect(page.locator(".login-success-overlay__infinity, .login-success-overlay__trails")).toHaveCount(0);

  const desktopSplashMark = desktopSuccessOverlay.locator(".brand-lockup--mark-only");
  await expect(desktopSplashMark).toBeVisible();
  const desktopSplashBox = await desktopSplashMark.boundingBox();
  expect(desktopSplashBox?.width ?? 0).toBeGreaterThanOrEqual(140);
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

test("family creation makes church and UPG relationship easy to fill", async ({ page }) => {
  await page.goto("/families/new");

  await expect(page.getByRole("heading", { name: "Igreja, UPG e participacao" })).toBeVisible();
  await expect(page.getByText("Frequenta igreja ou UPG")).toBeVisible();

  const incomeField = page.getByRole("spinbutton", { name: "Renda mensal total" });
  const churchNameField = page.getByRole("textbox", { name: "Igreja ou UPG" });
  const communityRelationshipField = page.getByRole("textbox", {
    name: "O que faz ou qual vinculo possui",
  });

  await incomeField.fill("850");
  await incomeField.blur();
  await churchNameField.fill("UPG Central");
  await communityRelationshipField.fill("Voluntaria no acolhimento");

  await expect(incomeField).toHaveValue("850.00");
  await expect(churchNameField).toHaveValue("UPG Central");
  await expect(communityRelationshipField).toHaveValue("Voluntaria no acolhimento");
});

test("family detail highlights system suggestion and church shortcut", async ({ page }) => {
  await page.goto("/families/1");

  await expect(
    page.getByRole("heading", { name: "Sugestao do sistema e decisao da lideranca" })
  ).toBeVisible();
  await expect(page.getByText("Sugestao: Apta recorrente")).toBeVisible();
  await expect(page.getByText("Ultima decisao registrada")).toBeVisible();
  await expect(page.getByRole("link", { name: "Igreja/UPG" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Registrar avaliacao" })).toBeVisible();
});

test("family member edit has its own church link separate from income", async ({ page }) => {
  await page.goto("/families/1/people/1/edit");

  await expect(
    page.getByRole("heading", { name: "Igreja, UPG e participacao do membro" })
  ).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: "Renda individual" })).toBeVisible();
  await expect(page.getByLabel("Frequenta igreja ou UPG")).toBeChecked();
  await expect(page.getByRole("textbox", { name: "Igreja ou UPG" })).toHaveValue(
    "UPG Central"
  );
  await expect(page.getByRole("textbox", { name: "Cargo, funcao ou vinculo" })).toHaveValue(
    "Voluntaria"
  );
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

test("desktop sidebar collapses and account logout returns to login", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");

  await page.getByLabel("Nome de login").fill("admin");
  await page.getByLabel("Senha").fill("Admin@123456");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByRole("heading", { name: /Dashboard do Cesta Digital/i })).toBeVisible();

  await page.getByRole("button", { name: "Recolher menu lateral" }).click();
  await expect(page.getByRole("button", { name: "Expandir menu lateral" })).toBeVisible();

  await page.getByRole("button", { name: "Expandir menu lateral" }).click();
  await expect(page.getByRole("button", { name: "Recolher menu lateral" })).toBeVisible();

  await page.getByRole("button", { name: /Conta de Admin Homologacao/i }).click();
  await page.getByRole("menuitem", { name: "Sair" }).click();

  await expect(page.getByLabel("Nome de login")).toBeVisible();
});

test("admin pages stay restricted for non-admin users", async ({ page }) => {
  await page.unroute("**/auth/me");
  await page.route("**/auth/me", async (route) => fulfillJson(route, operatorUser));

  await page.goto("/");

  const mainNav = page.getByLabel("Navegacao principal");
  await expect(mainNav.getByRole("link", { name: /Usuarios/i })).toHaveCount(0);
  await expect(mainNav.getByRole("link", { name: /Auditoria/i })).toHaveCount(0);

  await page.goto("/users");
  await expect(page.getByRole("heading", { name: "Acesso restrito" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Voltar ao painel" })).toBeVisible();

  await page.goto("/audit-logs");
  await expect(page.getByRole("heading", { name: "Acesso restrito" })).toBeVisible();
});

test("audit page uses administrative language with technical details on demand", async ({ page }) => {
  await page.goto("/audit-logs");

  await expect(page.getByRole("heading", { name: "Auditoria do sistema" })).toBeVisible();
  const auditTable = page.getByRole("table", {
    name: "Eventos recentes da auditoria do sistema",
  });
  await expect(auditTable.getByText("Login realizado", { exact: true })).toBeVisible();
  await expect(auditTable.getByText("Tentativa de login falhou", { exact: true })).toBeVisible();
  await expect(auditTable.getByText("Sucesso", { exact: true })).toBeVisible();
  await expect(page.locator(".audit-panel .table-wrapper")).not.toContainText("auth.login_succeeded");
  await expect(page.locator(".audit-panel .table-wrapper")).not.toContainText('{"roles"');

  await page.getByRole("button", { name: "Ver detalhes" }).first().click();

  const detailsDialog = page.getByRole("dialog", { name: "Login realizado" });
  await expect(detailsDialog).toBeVisible();
  await expect(page.getByText("Codigo tecnico")).toBeVisible();
  await expect(detailsDialog.getByText("auth.login_succeeded", { exact: true })).toBeVisible();
  await expect(detailsDialog.getByText("Perfis", { exact: true })).toBeVisible();
  await expect(detailsDialog.getByText("Administrador", { exact: true })).toBeVisible();
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
