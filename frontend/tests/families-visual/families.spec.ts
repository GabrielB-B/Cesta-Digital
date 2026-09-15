import path from "node:path";
import { mkdir } from "node:fs/promises";
import { expect, test, type Route } from "@playwright/test";

const familyFormsEvidenceDirectory = path.resolve("showcase/evidence/v2-17");
const memberFormsEvidenceDirectory = path.resolve("showcase/evidence/v2-18");

const currentUser = {
  id: 1,
  name: "Ana Silva",
  login_name: "ana.silva",
  email: "ana.silva@cestadigital.org",
  is_active: true,
  roles: ["admin", "lider_social", "operador"],
};

const baseFamily = {
  id: 1,
  internal_code: "FAM-01248",
  status: "apta_recorrente",
  registration_date: "2025-01-10",
  last_evaluation_date: "2026-08-12",
  next_revaluation_date: "2026-11-12",
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
  contacts: [
    {
      id: 1,
      contact_name: "Maria Silva",
      phone: "(11) 98765-4321",
      contact_type: "principal",
      is_whatsapp: true,
      notes: null,
    },
  ],
};

const familyRows = [
  baseFamily,
  { ...baseFamily, id: 2, internal_code: "FAM-01247", neighborhood: "Centro", city: "Osasco", status: "apta_recorrente", total_residents: 3, income_per_capita: "280.00", last_evaluation_date: "2026-08-10" },
  { ...baseFamily, id: 3, internal_code: "FAM-01246", neighborhood: "Vila Nova", city: "São Paulo", status: "apta_emergencial", total_residents: 5, income_per_capita: "190.00", last_evaluation_date: "2026-08-08" },
  { ...baseFamily, id: 4, internal_code: "FAM-01245", neighborhood: "Jardim Europa", city: "Guarulhos", status: "em_analise", total_residents: 2, income_per_capita: "420.00", last_evaluation_date: null },
  { ...baseFamily, id: 5, internal_code: "FAM-01244", neighborhood: "Bela Vista", city: "São Paulo", status: "inativa", total_residents: 4, income_per_capita: "510.00", last_evaluation_date: "2026-07-20" },
  { ...baseFamily, id: 6, internal_code: "FAM-01243", neighborhood: "Vila Mariana", city: "São Paulo", status: "apta_recorrente", total_residents: 6, income_per_capita: "240.00", last_evaluation_date: "2026-07-18" },
  { ...baseFamily, id: 7, internal_code: "FAM-01242", neighborhood: "Mooca", city: "São Paulo", status: "em_analise", total_residents: 3, income_per_capita: "360.00", last_evaluation_date: null },
  { ...baseFamily, id: 8, internal_code: "FAM-01241", neighborhood: "Tatuapé", city: "São Paulo", status: "apta_recorrente", total_residents: 4, income_per_capita: "315.00", last_evaluation_date: "2026-07-12" },
];

function detailFor(id: number) {
  const row = familyRows.find((family) => family.id === id) ?? baseFamily;
  return {
    ...row,
    contacts: row.contacts.map((contact) => ({ ...contact, id })),
    people: [
      {
        id,
        full_name: row.contacts[0]?.contact_name ?? "Maria Silva",
        birth_date: "1988-05-10",
        kinship: "Responsável",
        gender: "feminino",
        phone: row.contacts[0]?.phone ?? null,
        education_level: "médio",
        is_currently_studying: false,
        is_currently_working: true,
        occupation: "Autônoma",
        individual_income: "900.00",
        attends_church: true,
        church_name: "UPG Central",
        church_role: "Voluntária",
        has_disability: false,
        has_chronic_illness: false,
        is_pregnant: false,
        is_nursing_mother: false,
        notes: null,
        is_family_responsible: true,
      },
      {
        id: id + 100,
        full_name: "Lucas Silva",
        birth_date: "2014-03-11",
        kinship: "Filho",
        gender: "masculino",
        phone: null,
        education_level: "fundamental",
        is_currently_studying: true,
        is_currently_working: false,
        occupation: null,
        individual_income: "0.00",
        attends_church: false,
        church_name: null,
        church_role: null,
        has_disability: false,
        has_chronic_illness: false,
        is_pregnant: false,
        is_nursing_mother: false,
        notes: null,
        is_family_responsible: false,
      },
    ],
    benefits: [
      {
        id,
        person_id: null,
        benefit_type: "Bolsa Família",
        monthly_amount: "480.00",
        counts_as_income: true,
        is_active: true,
        start_date: "2025-01-01",
        end_date: null,
        notes: null,
      },
    ],
    assessments: [
      {
        id,
        assessment_date: "2026-08-12",
        monthly_income_total_at_time: row.monthly_income_total,
        income_per_capita_at_time: row.income_per_capita,
        vulnerability_score: 7,
        system_suggestion: "apta_recorrente",
        final_decision: "apta_recorrente",
        decision_reason: "Critérios sociais confirmados.",
        exception_reason: null,
        approved_by_user_id: 1,
        co_approved_by_user_id: null,
        next_revaluation_date: "2026-11-12",
        technical_notes: null,
      },
    ],
  };
}

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
  await page.route(/^http:\/\/127\.0\.0\.1:8000\/families(?:\?.*)?$/, (route) =>
    fulfillJson(route, familyRows, { "X-Total-Count": "248" }),
  );
  await page.route(
    /^http:\/\/127\.0\.0\.1:8000\/families\/\d+\/eligibility-preview$/,
    (route) =>
      fulfillJson(route, {
        family_id: 1,
        internal_code: "FAM-01248",
        income_per_capita: "300.00",
        extreme_poverty_limit: "109.00",
        poverty_limit: "218.00",
        system_suggestion: "apta_recorrente",
        poverty_band: "baixa_renda",
        economic_reason: "Renda e fatores sociais indicam continuidade do atendimento.",
        social_weight_score: 7,
        social_aggravating_factors: ["Há desemprego na família"],
        priority_level: "media",
      }),
  );
  await page.route(/^http:\/\/127\.0\.0\.1:8000\/families\/\d+$/, async (route) => {
    const match = new URL(route.request().url()).pathname.match(/\/families\/(\d+)$/);
    await fulfillJson(route, detailFor(Number(match?.[1] ?? 1)));
  });
  await page.goto("/families");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { name: "Famílias", exact: true })).toBeVisible();
});

test("lista usa tabela no desktop, cards no mobile e não causa overflow", async ({ page }, testInfo) => {
  const viewportWidth = page.viewportSize()?.width ?? 0;
  const table = page.getByRole("table", { name: "Famílias cadastradas" });
  const cards = page.getByRole("link", { name: /FAM-01/ });

  if (viewportWidth >= 1100) {
    await expect(table).toBeVisible();
    await expect(page.getByLabel("Família selecionada")).toBeVisible();
  } else {
    await expect(table).toBeHidden();
    await expect(cards.first()).toBeVisible();
    await expect(page.getByLabel("Família selecionada")).toBeHidden();
  }

  await expect(page.getByText("CPF")).toHaveCount(0);
  await expect(page.getByText("Nome da família")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.screenshot({
    path: testInfo.outputPath(`familias-${testInfo.project.name}.png`),
    fullPage: viewportWidth >= 1100,
  });
});

test("seleção desktop persiste no URL e carrega apenas um detalhe", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1100, "Seleção lateral exclusiva do desktop.");
  await page.getByRole("button", { name: "FAM-01247", exact: true }).click();
  await expect(page).toHaveURL(/selected=2/);
  await expect(page.getByLabel("Família selecionada")).toContainText("FAM-01247");
});

test("busca e status permanecem no URL", async ({ page }) => {
  await page.getByLabel("Buscar famílias").fill("Jardim");
  await page.getByRole("button", { name: /Filtros/ }).click();
  await page.getByLabel("Status da família").selectOption("em_analise");
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page).toHaveURL(/q=Jardim/);
  await expect(page).toHaveURL(/status=em_analise/);
});

test("detalhe separa cálculo, decisão e conteúdo social", async ({ page }, testInfo) => {
  await page.goto("/families/1");
  await expect(page.getByRole("heading", { name: "FAM-01248" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sugestão do sistema e decisão da liderança" })).toBeVisible();
  await expect(page.getByText("Sugestão calculada")).toBeVisible();
  await expect(page.getByText("Última decisão registrada")).toBeVisible();
  await expect(page.getByRole("link", { name: "Registrar avaliação" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.screenshot({
    path: testInfo.outputPath(`familia-detalhe-${testInfo.project.name}.png`),
    fullPage: (page.viewportSize()?.width ?? 0) >= 1100,
  });
});

test("cadastro de família usa etapas legíveis sem placeholders ou overflow", async ({
  page,
}, testInfo) => {
  test.skip(
    !["mobile-390", "desktop-1440"].includes(testInfo.project.name),
    "Evidência dos formulários concentrada nos viewports de aprovação.",
  );

  const isDesktop = testInfo.project.name === "desktop-1440";
  await page.goto("/families/new");
  await page.evaluate(() => document.fonts.ready);

  await expect(
    page.getByRole("heading", { level: 1, name: "Cadastrar família" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Cadastro e endereço" }),
  ).toBeVisible();
  await expect(page.locator("input[placeholder], textarea[placeholder]")).toHaveCount(0);

  const stepNavigation = page.getByRole("navigation", {
    name: "Etapas do cadastro da família",
  });
  if (isDesktop) {
    await expect(
      stepNavigation.getByRole("button", { name: "Etapa 5: Revisão" }),
    ).toBeVisible();
  } else {
    await expect(stepNavigation.getByText("Etapa 1 de 5")).toBeVisible();
  }

  const fieldFontSize = await page
    .getByRole("textbox", { name: "Rua" })
    .evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  expect(fieldFontSize).toBeGreaterThanOrEqual(isDesktop ? 15 : 16);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);

  await mkdir(familyFormsEvidenceDirectory, { recursive: true });
  await page.screenshot({
    path: path.join(
      familyFormsEvidenceDirectory,
      isDesktop
        ? "familia-cadastro-desktop-1440.png"
        : "familia-cadastro-mobile-390.png",
    ),
  });
});

test("edição preserva o contexto da avaliação até a revisão", async ({
  page,
}, testInfo) => {
  test.skip(
    !["mobile-390", "desktop-1440"].includes(testInfo.project.name),
    "Evidência dos formulários concentrada nos viewports de aprovação.",
  );

  const isDesktop = testInfo.project.name === "desktop-1440";
  await page.goto("/families/1/edit");
  await expect(
    page.getByRole("heading", { level: 1, name: "Editar família" }),
  ).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Status do cadastro" })).toHaveValue(
    "apta_recorrente",
  );

  await page.getByRole("button", { name: "Próximo" }).click();
  await expect(page.getByRole("heading", { name: "Moradores e moradia" })).toBeVisible();
  await page.getByRole("button", { name: "Próximo" }).click();
  await expect(page.getByRole("heading", { name: "Renda e condições sociais" })).toBeVisible();
  await page.getByRole("button", { name: "Próximo" }).click();
  await expect(page.getByRole("heading", { name: "Contato e rede de apoio" })).toBeVisible();
  await page.getByRole("button", { name: "Próximo" }).click();
  await expect(page.getByRole("heading", { name: "Revisão e observações" })).toBeVisible();
  await expect(page.getByText("R$ 300,00 por pessoa")).toBeVisible();
  await expect(page.getByRole("button", { name: "Salvar alterações" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);

  await mkdir(familyFormsEvidenceDirectory, { recursive: true });
  await page.screenshot({
    path: path.join(
      familyFormsEvidenceDirectory,
      isDesktop
        ? "familia-edicao-revisao-desktop-1440.png"
        : "familia-edicao-revisao-mobile-390.png",
    ),
  });
});

test("cadastro de membro mantém o formulário claro e legível nos dois layouts", async ({ page }, testInfo) => {
  test.skip(
    !["mobile-390", "desktop-1440"].includes(testInfo.project.name),
    "Evidência dos membros concentrada nos viewports de aprovação.",
  );

  const isDesktop = testInfo.project.name === "desktop-1440";
  await page.goto("/families/1/people/new");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { level: 1, name: "Novo membro" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dados do membro" })).toBeVisible();
  await expect(page.locator("form input[placeholder], form textarea[placeholder]")).toHaveCount(0);

  const fontSize = await page.getByRole("textbox", { name: "Nome completo" })
    .evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  expect(fontSize).toBeGreaterThanOrEqual(isDesktop ? 15 : 16);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  if (isDesktop) {
    await expect(page.getByRole("navigation", { name: "Etapas do membro" })
      .getByRole("button", { name: "Etapa 3: Revisão" })).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Resumo do membro" })).toBeVisible();
  } else {
    await expect(page.getByText("Etapa 1 de 3")).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Resumo do membro" })).toBeHidden();
  }

  await mkdir(memberFormsEvidenceDirectory, { recursive: true });
  await page.screenshot({
    path: path.join(memberFormsEvidenceDirectory, `membro-cadastro-${testInfo.project.name}.png`),
    fullPage: isDesktop,
  });
});

test("edição de membro preserva dados existentes e chega à revisão sem salvar", async ({ page }, testInfo) => {
  test.skip(
    !["mobile-390", "desktop-1440"].includes(testInfo.project.name),
    "Evidência dos membros concentrada nos viewports de aprovação.",
  );

  await page.goto("/families/1/people/1/edit");
  await expect(page.getByRole("heading", { level: 1, name: "Editar membro" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Escolaridade" })).toHaveValue("médio");
  await page.getByRole("button", { name: "Próximo" }).click();
  await expect(page.getByRole("heading", { name: "Trabalho e condições" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Igreja ou UPG" })).toHaveValue("UPG Central");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await mkdir(memberFormsEvidenceDirectory, { recursive: true });
  await page.screenshot({
    path: path.join(memberFormsEvidenceDirectory, `membro-edicao-condicoes-${testInfo.project.name}.png`),
    fullPage: testInfo.project.name === "desktop-1440",
  });

  await page.getByRole("button", { name: "Próximo" }).click();
  await expect(page.getByRole("heading", { name: "Revisar membro" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Salvar alterações" })).toBeVisible();
  await expect(page).toHaveURL(/\/people\/1\/edit$/);
  await page.screenshot({
    path: path.join(memberFormsEvidenceDirectory, `membro-edicao-revisao-${testInfo.project.name}.png`),
    fullPage: testInfo.project.name === "desktop-1440",
  });
});
