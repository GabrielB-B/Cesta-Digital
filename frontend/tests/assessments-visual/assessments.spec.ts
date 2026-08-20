import { expect, test, type Route } from "@playwright/test";

const currentUser = {
  id: 1,
  name: "Ana Silva",
  login_name: "ana.silva",
  email: "ana.silva@cestadigital.org",
  is_active: true,
  roles: ["admin", "lider_social", "operador"],
};

const queueItems = [
  {
    family_id: 1,
    internal_code: "FAM-01248",
    responsible_name: "Maria Silva",
    total_residents: 4,
    neighborhood: "Jardim Primavera",
    city: "São Paulo",
    state: "SP",
    family_status: "apta_recorrente",
    queue_status: "reavaliacao_vencida",
    queue_reason: "prazo_vencido",
    latest_assessment_id: 18,
    latest_assessment_date: "2026-04-12",
    latest_system_suggestion: "apta_recorrente",
    latest_final_decision: "apta_recorrente",
    latest_vulnerability_score: 7,
    latest_approved_by_user_id: 1,
    latest_approved_by_name: "Ana Silva",
    next_revaluation_date: "2026-08-12",
    current_system_suggestion: "apta_emergencial",
    current_social_weight_score: 9,
    current_priority_level: "alta",
    current_preview_differs_from_decision: true,
  },
  {
    family_id: 2,
    internal_code: "FAM-01247",
    responsible_name: "João Santos",
    total_residents: 3,
    neighborhood: "Centro",
    city: "Osasco",
    state: "SP",
    family_status: "em_analise",
    queue_status: "sem_avaliacao",
    queue_reason: "nunca_avaliada",
    latest_assessment_id: null,
    latest_assessment_date: null,
    latest_system_suggestion: null,
    latest_final_decision: null,
    latest_vulnerability_score: null,
    latest_approved_by_user_id: null,
    latest_approved_by_name: null,
    next_revaluation_date: null,
    current_system_suggestion: "apta_recorrente",
    current_social_weight_score: 6,
    current_priority_level: "media",
    current_preview_differs_from_decision: false,
  },
  {
    family_id: 3,
    internal_code: "FAM-01246",
    responsible_name: "Ana Oliveira",
    total_residents: 5,
    neighborhood: "Vila Nova",
    city: "São Paulo",
    state: "SP",
    family_status: "apta_emergencial",
    queue_status: "reavaliacao_proxima",
    queue_reason: "prazo_proximo",
    latest_assessment_id: 16,
    latest_assessment_date: "2026-05-28",
    latest_system_suggestion: "apta_emergencial",
    latest_final_decision: "apta_emergencial",
    latest_vulnerability_score: 8,
    latest_approved_by_user_id: 1,
    latest_approved_by_name: "Ana Silva",
    next_revaluation_date: "2026-08-28",
    current_system_suggestion: "apta_emergencial",
    current_social_weight_score: 8,
    current_priority_level: "alta",
    current_preview_differs_from_decision: false,
  },
  {
    family_id: 4,
    internal_code: "FAM-01245",
    responsible_name: "Carlos Costa",
    total_residents: 2,
    neighborhood: "Jardim Europa",
    city: "Guarulhos",
    state: "SP",
    family_status: "apta_recorrente",
    queue_status: "em_dia",
    queue_reason: "prazo_em_dia",
    latest_assessment_id: 15,
    latest_assessment_date: "2026-07-05",
    latest_system_suggestion: "apta_recorrente",
    latest_final_decision: "apta_recorrente",
    latest_vulnerability_score: 4,
    latest_approved_by_user_id: 1,
    latest_approved_by_name: "Ana Silva",
    next_revaluation_date: "2026-11-05",
    current_system_suggestion: "apta_recorrente",
    current_social_weight_score: 4,
    current_priority_level: "baixa",
    current_preview_differs_from_decision: false,
  },
  {
    family_id: 5,
    internal_code: "FAM-01244",
    responsible_name: "Fernanda Souza",
    total_residents: 6,
    neighborhood: "Bela Vista",
    city: "São Paulo",
    state: "SP",
    family_status: "apta_recorrente",
    queue_status: "reavaliacao_vencida",
    queue_reason: "prazo_nao_definido",
    latest_assessment_id: 14,
    latest_assessment_date: "2026-03-20",
    latest_system_suggestion: "apta_recorrente",
    latest_final_decision: "apta_recorrente",
    latest_vulnerability_score: 6,
    latest_approved_by_user_id: 1,
    latest_approved_by_name: "Ana Silva",
    next_revaluation_date: null,
    current_system_suggestion: "apta_recorrente",
    current_social_weight_score: 6,
    current_priority_level: "media",
    current_preview_differs_from_decision: false,
  },
  {
    family_id: 6,
    internal_code: "FAM-01243",
    responsible_name: "Lucas Pereira",
    total_residents: 4,
    neighborhood: "Vila Mariana",
    city: "São Paulo",
    state: "SP",
    family_status: "em_analise",
    queue_status: "sem_avaliacao",
    queue_reason: "nunca_avaliada",
    latest_assessment_id: null,
    latest_assessment_date: null,
    latest_system_suggestion: null,
    latest_final_decision: null,
    latest_vulnerability_score: null,
    latest_approved_by_user_id: null,
    latest_approved_by_name: null,
    next_revaluation_date: null,
    current_system_suggestion: "apta_emergencial",
    current_social_weight_score: 10,
    current_priority_level: "urgente",
    current_preview_differs_from_decision: false,
  },
  {
    family_id: 7,
    internal_code: "FAM-01242",
    responsible_name: "Patrícia Lima",
    total_residents: 3,
    neighborhood: "Mooca",
    city: "São Paulo",
    state: "SP",
    family_status: "apta_recorrente",
    queue_status: "reavaliacao_proxima",
    queue_reason: "prazo_proximo",
    latest_assessment_id: 12,
    latest_assessment_date: "2026-06-01",
    latest_system_suggestion: "apta_recorrente",
    latest_final_decision: "apta_recorrente",
    latest_vulnerability_score: 5,
    latest_approved_by_user_id: 1,
    latest_approved_by_name: "Ana Silva",
    next_revaluation_date: "2026-09-01",
    current_system_suggestion: "apta_recorrente",
    current_social_weight_score: 5,
    current_priority_level: "media",
    current_preview_differs_from_decision: false,
  },
  {
    family_id: 8,
    internal_code: "FAM-01241",
    responsible_name: "Ricardo Almeida",
    total_residents: 4,
    neighborhood: "Tatuapé",
    city: "São Paulo",
    state: "SP",
    family_status: "apta_recorrente",
    queue_status: "em_dia",
    queue_reason: "prazo_em_dia",
    latest_assessment_id: 11,
    latest_assessment_date: "2026-07-12",
    latest_system_suggestion: "apta_recorrente",
    latest_final_decision: "apta_recorrente",
    latest_vulnerability_score: 3,
    latest_approved_by_user_id: 1,
    latest_approved_by_name: "Ana Silva",
    next_revaluation_date: "2027-01-12",
    current_system_suggestion: "apta_recorrente",
    current_social_weight_score: 3,
    current_priority_level: "baixa",
    current_preview_differs_from_decision: false,
  },
];

const queueResponse = {
  items: queueItems,
  total: 176,
  limit: 25,
  offset: 0,
  reference_date: "2026-08-19",
  due_soon_days: 30,
  summary: {
    sem_avaliacao: 12,
    reavaliacao_vencida: 8,
    reavaliacao_proxima: 24,
    em_dia: 132,
    total: 176,
  },
};

const familyDetail = {
  id: 1,
  internal_code: "FAM-01248",
  status: "apta_recorrente",
  registration_date: "2025-01-10",
  last_evaluation_date: "2026-04-12",
  next_revaluation_date: "2026-08-12",
  monthly_income_total: "1200.00",
  monthly_essential_expenses: "760.00",
  income_per_capita: "300.00",
  receives_government_assistance: true,
  housing_type: "cedida",
  has_water_supply: true,
  has_electricity: true,
  has_sanitation: true,
  rooms_count: 4,
  bedrooms_count: 2,
  zip_code: "01234-567",
  street: "Rua das Flores",
  number: "123",
  complement: null,
  neighborhood: "Jardim Primavera",
  city: "São Paulo",
  state: "SP",
  reference_point: "Próximo à escola",
  total_residents: 4,
  total_adults: 2,
  total_children: 2,
  total_elderly: 0,
  total_babies: 0,
  has_pregnant_member: false,
  has_disabled_member: false,
  has_chronic_illness_member: false,
  has_unemployed_member: true,
  needs_extra_support: false,
  attends_church: true,
  church_name: "UPG Central",
  community_relationship: "Voluntária no acolhimento",
  responsible_education_level: "Ensino médio",
  has_internet_access: true,
  has_mobile_phone: true,
  has_computer: false,
  social_notes: null,
  internal_notes: null,
  contacts: [{ id: 1, contact_name: "Maria Silva", phone: "(11) 98765-4321", contact_type: "principal", is_whatsapp: true, notes: null }],
  people: [{ id: 1, full_name: "Maria Silva", birth_date: "1988-05-10", kinship: "Responsável", gender: "feminino", phone: "(11) 98765-4321", education_level: "médio", is_currently_studying: false, is_currently_working: true, occupation: "Autônoma", individual_income: "900.00", attends_church: true, church_name: "UPG Central", church_role: "Voluntária", has_disability: false, has_chronic_illness: false, is_pregnant: false, is_nursing_mother: false, notes: null, is_family_responsible: true }],
  benefits: [],
  assessments: [{ id: 18, assessment_date: "2026-04-12", monthly_income_total_at_time: "1200.00", income_per_capita_at_time: "300.00", vulnerability_score: 7, system_suggestion: "apta_recorrente", final_decision: "apta_recorrente", decision_reason: "Critérios sociais confirmados.", exception_reason: null, approved_by_user_id: 1, co_approved_by_user_id: null, next_revaluation_date: "2026-08-12", technical_notes: null }],
};

const eligibilityPreview = {
  family_id: 1,
  internal_code: "FAM-01248",
  income_per_capita: "300.00",
  extreme_poverty_limit: "109.00",
  poverty_limit: "218.00",
  system_suggestion: "apta_emergencial",
  poverty_band: "baixa_renda",
  economic_reason: "A renda atual e os agravantes indicam atendimento emergencial.",
  social_weight_score: 9,
  social_aggravating_factors: ["has_unemployed_member", "needs_extra_support"],
  priority_level: "alta",
};

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

test.beforeEach(async ({ page }) => {
  await page.route("**/auth/me", (route) => fulfillJson(route, currentUser));
  await page.route("**/social-assessments/queue**", (route) => fulfillJson(route, queueResponse));
  await page.route("**/families/1/eligibility-preview", (route) => fulfillJson(route, eligibilityPreview));
  await page.route(/\/families\/1$/, (route) => fulfillJson(route, familyDetail));
  await page.route("**/families/1/assessments", async (route) => {
    if (route.request().method() === "POST") {
      await fulfillJson(route, familyDetail.assessments[0], 201);
      return;
    }
    await route.fallback();
  });
  await page.goto("/assessments");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { name: "Avaliações sociais" })).toBeVisible();
});

test("fila usa painel no desktop, cards nas telas menores e não causa overflow", async ({ page }, testInfo) => {
  const viewportWidth = page.viewportSize()?.width ?? 0;
  const table = page.getByRole("table", { name: "Fila de avaliações sociais" });

  if (viewportWidth >= 1100) {
    await expect(table).toBeVisible();
    await expect(page.getByLabel("Avaliação selecionada")).toBeVisible();
    await expect(page.getByLabel("Navegação principal").getByRole("link", { name: "Avaliações" })).toHaveAttribute("aria-current", "page");
  } else {
    await expect(table).toBeHidden();
    await expect(page.locator("article").first()).toBeVisible();
    await expect(page.getByLabel("Avaliação selecionada")).toBeHidden();
    await expect(page.getByLabel("Atalhos principais").getByRole("link", { name: "Avaliações" })).toHaveAttribute("aria-current", "page");
  }

  await expect(page.getByText("Triagem e pré-cadastro")).toHaveCount(0);
  await expect(page.getByText("Análise documental")).toHaveCount(0);
  await expect(page.getByText("Visita social")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.screenshot({
    path: testInfo.outputPath(`avaliacoes-${testInfo.project.name}.png`),
    fullPage: viewportWidth >= 1100,
  });
});

test("filtros operacionais permanecem na URL", async ({ page }) => {
  await page.getByRole("button", { name: /Reavaliações vencidas/ }).click();
  await expect(page).toHaveURL(/status=reavaliacao_vencida/);
  await page.getByLabel("Buscar avaliações").fill("Primavera");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page).toHaveURL(/q=Primavera/);
});

test("formulário separa cálculo, decisão técnica e retorno", async ({ page }, testInfo) => {
  test.skip(!["mobile-390", "desktop-1440"].includes(testInfo.project.name), "Evidência principal em mobile e desktop.");
  await page.goto("/families/1/assessments/new");
  await expect(page.getByRole("heading", { name: "Avaliar FAM-01248" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cálculo de elegibilidade" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Decisão técnica" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Próxima reavaliação" })).toBeVisible();
  await expect(page.locator('input[name="vulnerability_score"]')).toHaveCount(0);
  await expect(page.getByText("Leitura automática, sem edição manual")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.screenshot({
    path: testInfo.outputPath(`avaliacao-formulario-${testInfo.project.name}.png`),
    fullPage: true,
  });
});

test("registro não envia score editável no payload", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "Contrato verificado uma vez no desktop.");
  await page.goto("/families/1/assessments/new");
  const requestPromise = page.waitForRequest((request) =>
    request.url().endsWith("/families/1/assessments") && request.method() === "POST",
  );
  await page.getByLabel("Fundamentação da decisão").fill("Condição emergencial confirmada em análise técnica.");
  await page.getByRole("button", { name: "Registrar avaliação" }).click();
  const request = await requestPromise;
  const payload = request.postDataJSON();
  expect(payload).not.toHaveProperty("vulnerability_score");
  expect(payload.final_decision).toBe("apta_emergencial");
  await expect(page).toHaveURL(/\/assessments\?selected=1/);
});
