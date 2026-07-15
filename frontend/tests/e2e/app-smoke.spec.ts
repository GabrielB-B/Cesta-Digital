import { expect, type Page, type Route, test } from "@playwright/test";
import {
  compareStockBatchesByFefo,
  formatSaoPauloTodayForInput,
  formatStockMovementType,
  getBatchExpirationStatus,
  isStockBatchReceived,
} from "../../src/utils/stock";

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
  category_name: "Alimentos",
  unit_measure: "pacote",
  tracks_expiration: true,
  is_active: true,
  minimum_stock_alert: 10,
  total_quantity: 8,
  total_batches: 4,
  is_below_minimum: true,
};

const inactiveStockItem = {
  item_id: 9,
  item_name: "Farinha descontinuada",
  category_id: 1,
  category_name: "alimentos",
  unit_measure: "pacote",
  tracks_expiration: true,
  is_active: false,
  minimum_stock_alert: 5,
  total_quantity: 0,
  total_batches: 1,
  is_below_minimum: true,
};

const itemDetails = [
  {
    id: 1,
    category_id: 1,
    category_name: "Alimentos",
    name: "Arroz 1kg",
    unit_measure: "pacote",
    tracks_expiration: true,
    is_active: true,
    reference_unit_value: "7.50",
    minimum_stock_alert: 10,
    notes: null,
  },
  {
    id: 2,
    category_id: 1,
    category_name: "Alimentos",
    name: "Feijao 1kg",
    unit_measure: "pacote",
    tracks_expiration: true,
    is_active: true,
    reference_unit_value: "8.00",
    minimum_stock_alert: 5,
    notes: null,
  },
  {
    id: 3,
    category_id: 2,
    category_name: "Higiene",
    name: "Sabonete",
    unit_measure: "unidade",
    tracks_expiration: false,
    is_active: true,
    reference_unit_value: "2.50",
    minimum_stock_alert: 3,
    notes: null,
  },
  {
    id: 9,
    category_id: 1,
    category_name: "Alimentos",
    name: "Farinha descontinuada",
    unit_measure: "pacote",
    tracks_expiration: true,
    is_active: false,
    reference_unit_value: "4.00",
    minimum_stock_alert: 5,
    notes: "Item fora de uso",
  },
];

const itemCategories = [
  { id: 1, name: "Alimentos", description: null, is_active: true },
  { id: 2, name: "Higiene", description: null, is_active: true },
];

const stockBatches = [
  {
    id: 1,
    item_id: 1,
    source_type: "doacao_item",
    entry_quantity: 10,
    current_quantity: 8,
    entry_date: "2026-06-01",
    expiration_date: "2099-12-31",
    estimated_unit_value: "7.50",
    notes: null,
    created_by_user_id: 1,
  },
  {
    id: 2,
    item_id: 1,
    source_type: "compra_igreja",
    entry_quantity: 2,
    current_quantity: 2,
    entry_date: "2020-01-01",
    expiration_date: "2020-02-01",
    estimated_unit_value: "7.00",
    notes: "Separado para descarte",
    created_by_user_id: 1,
  },
  {
    id: 3,
    item_id: 1,
    source_type: "ajuste",
    entry_quantity: 1,
    current_quantity: 1,
    entry_date: "2026-06-01",
    expiration_date: null,
    estimated_unit_value: "0.00",
    notes: null,
    created_by_user_id: 1,
  },
  {
    id: 4,
    item_id: 3,
    source_type: "doacao_item",
    entry_quantity: 12,
    current_quantity: 12,
    entry_date: "2026-06-15",
    expiration_date: null,
    estimated_unit_value: "2.50",
    notes: null,
    created_by_user_id: 1,
  },
  {
    id: 5,
    item_id: 2,
    source_type: "doacao_item",
    entry_quantity: 6,
    current_quantity: 6,
    entry_date: "2026-07-14",
    expiration_date: "2099-12-31",
    estimated_unit_value: "8.00",
    notes: null,
    created_by_user_id: 1,
  },
  {
    id: 6,
    item_id: 3,
    source_type: "ajuste",
    entry_quantity: 2,
    current_quantity: 2,
    entry_date: "2020-01-01",
    expiration_date: "2020-02-01",
    estimated_unit_value: "2.00",
    notes: "Data legada informada",
    created_by_user_id: 1,
  },
  {
    id: 7,
    item_id: 1,
    source_type: "doacao_item",
    entry_quantity: 3,
    current_quantity: 3,
    entry_date: "2099-01-01",
    expiration_date: "2099-02-01",
    estimated_unit_value: "7.25",
    notes: "Recebimento futuro para teste de seguranca",
    created_by_user_id: 1,
  },
  {
    id: 8,
    item_id: 9,
    source_type: "doacao_item",
    entry_quantity: 4,
    current_quantity: 4,
    entry_date: "2026-06-10",
    expiration_date: "2099-10-10",
    estimated_unit_value: "4.00",
    notes: null,
    created_by_user_id: 1,
  },
];

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
  const mockedItems = itemDetails.map((entry) => ({ ...entry }));
  const mockedStockBatches = stockBatches.map((entry) => ({ ...entry }));
  const mockedStockMovements: Array<{
    id: number;
    batch_id: number;
    item_id: number;
    movement_type: string;
    quantity: number;
    notes: string | null;
    created_by_user_id: number;
  }> = [];
  const mockedStockSummaries = [
    { ...item },
    { ...inactiveStockItem },
  ];

  const recomputeStockSummary = (itemId: number) => {
    const summary = mockedStockSummaries.find(
      (entry) => entry.item_id === itemId
    );
    const summaryItem = mockedItems.find((entry) => entry.id === itemId);

    if (!summary || !summaryItem) {
      return;
    }

    const itemBatches = mockedStockBatches.filter(
      (batch) => batch.item_id === itemId
    );
    const totalQuantity = itemBatches.reduce((total, batch) => {
      const isUsable =
        summaryItem.is_active &&
        batch.current_quantity > 0 &&
        isStockBatchReceived(batch) &&
        !getBatchExpirationStatus(batch, summaryItem.tracks_expiration)
          .blocksManualExit;

      return total + (isUsable ? batch.current_quantity : 0);
    }, 0);

    summary.total_quantity = totalQuantity;
    summary.total_batches = itemBatches.length;
    summary.is_below_minimum =
      totalQuantity < summary.minimum_stock_alert;
  };

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
      message: "Se o e-mail estiver cadastrado, a equipe poderá redefinir sua senha.",
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
  await page.route("**/item-categories", async (route) => {
    if (route.request().resourceType() === "document") {
      await route.fallback();
      return;
    }

    await fulfillJson(route, itemCategories);
  });
  await page.route(/\/items(?:\?.*)?$/, async (route) => {
    if (route.request().resourceType() === "document") {
      await route.fallback();
      return;
    }

    if (route.request().method() === "POST") {
      const payload = route.request().postDataJSON();
      const createdItem = {
        ...itemDetails[1],
        ...payload,
        id: 2,
        category_name: "Alimentos",
        reference_unit_value: String(payload.reference_unit_value ?? "0"),
      };
      const existingIndex = mockedItems.findIndex(
        (entry) => entry.id === createdItem.id
      );

      if (existingIndex >= 0) {
        mockedItems[existingIndex] = createdItem;
      } else {
        mockedItems.push(createdItem);
      }

      await fulfillJson(route, createdItem);
      return;
    }

    const url = new URL(route.request().url());
    const activeFilter = url.searchParams.get("is_active");
    const response =
      activeFilter === "true"
        ? mockedItems.filter((entry) => entry.is_active)
        : mockedItems;
    await fulfillJson(route, response);
  });
  await page.route("**/items/*", async (route) => {
    if (route.request().resourceType() === "document") {
      await route.fallback();
      return;
    }

    const itemId = Number(new URL(route.request().url()).pathname.split("/").at(-1));
    const currentItem = mockedItems.find((entry) => entry.id === itemId) ?? mockedItems[0];

    if (route.request().method() === "PUT") {
      const payload = route.request().postDataJSON();
      const updatedItem = {
        ...currentItem,
        ...payload,
        id: itemId,
        category_name:
          itemCategories.find((category) => category.id === payload.category_id)
            ?.name ?? currentItem.category_name,
        reference_unit_value: String(payload.reference_unit_value ?? "0"),
      };
      const currentIndex = mockedItems.findIndex((entry) => entry.id === itemId);
      if (currentIndex >= 0) {
        mockedItems[currentIndex] = updatedItem;
      } else {
        mockedItems.push(updatedItem);
      }
      const summary = mockedStockSummaries.find(
        (entry) => entry.item_id === itemId
      );

      if (summary) {
        summary.item_name = updatedItem.name;
        summary.category_id = updatedItem.category_id;
        summary.category_name = updatedItem.category_name;
        summary.unit_measure = updatedItem.unit_measure;
        summary.tracks_expiration = updatedItem.tracks_expiration;
        summary.is_active = updatedItem.is_active;
        summary.minimum_stock_alert = updatedItem.minimum_stock_alert;
      }
      recomputeStockSummary(itemId);
      await fulfillJson(route, updatedItem);
      return;
    }

    const detail = currentItem;
    await fulfillJson(route, detail);
  });
  await page.route("**/stock-summary?**", async (route) =>
    fulfillJson(route, mockedStockSummaries, {
      "X-Total-Count": String(mockedStockSummaries.length),
    })
  );
  await page.route("**/stock-batches?**", async (route) => {
    const url = new URL(route.request().url());
    const itemId = Number(url.searchParams.get("item_id") ?? 0);
    const response = itemId
      ? mockedStockBatches.filter((batch) => batch.item_id === itemId)
      : mockedStockBatches;
    await fulfillJson(route, response, { "X-Total-Count": String(response.length) });
  });
  await page.route("**/stock-batches", async (route) => {
    if (route.request().method() === "POST") {
      const payload = route.request().postDataJSON();
      const createdBatch = {
        id:
          Math.max(0, ...mockedStockBatches.map((batch) => batch.id)) + 1,
        ...payload,
        current_quantity: payload.entry_quantity,
        estimated_unit_value: String(payload.estimated_unit_value ?? "0"),
        created_by_user_id: 1,
      };
      mockedStockBatches.push(createdBatch);
      const existingSummary = mockedStockSummaries.find(
        (entry) => entry.item_id === createdBatch.item_id
      );

      if (!existingSummary) {
        const createdItem = mockedItems.find(
          (entry) => entry.id === createdBatch.item_id
        );

        if (createdItem) {
          mockedStockSummaries.push({
            item_id: createdItem.id,
            item_name: createdItem.name,
            category_id: createdItem.category_id,
            category_name: createdItem.category_name,
            unit_measure: createdItem.unit_measure,
            tracks_expiration: createdItem.tracks_expiration,
            is_active: createdItem.is_active,
            minimum_stock_alert: createdItem.minimum_stock_alert,
            total_quantity: 0,
            total_batches: 0,
            is_below_minimum: true,
          });
        }
      }
      recomputeStockSummary(createdBatch.item_id);
      await fulfillJson(route, createdBatch);
      return;
    }

    await fulfillJson(route, mockedStockBatches);
  });
  await page.route("**/stock-movements?**", async (route) => {
    const url = new URL(route.request().url());
    const itemId = Number(url.searchParams.get("item_id") ?? 0);
    const batchId = Number(url.searchParams.get("batch_id") ?? 0);
    const response = mockedStockMovements.filter(
      (movement) =>
        (!itemId || movement.item_id === itemId) &&
        (!batchId || movement.batch_id === batchId)
    );
    await fulfillJson(route, response, {
      "X-Total-Count": String(response.length),
    });
  });
  await page.route("**/stock-movements", async (route) => {
    if (route.request().method() === "POST") {
      const payload = route.request().postDataJSON();
      const batch = mockedStockBatches.find(
        (entry) => entry.id === payload.batch_id
      );
      const batchItem = mockedItems.find((entry) => entry.id === batch?.item_id);

      if (!batch || !batchItem) {
        await route.fulfill({ status: 404 });
        return;
      }

      const quantityDelta =
        payload.movement_type === "ajuste_positivo"
          ? payload.quantity
          : -payload.quantity;
      batch.current_quantity += quantityDelta;
      recomputeStockSummary(batch.item_id);

      const createdMovement = {
        id: Math.max(9, ...mockedStockMovements.map((entry) => entry.id)) + 1,
        ...payload,
        notes: payload.notes ?? null,
        item_id: batch.item_id,
        created_by_user_id: 1,
      };
      mockedStockMovements.push(createdMovement);
      await fulfillJson(route, createdMovement);
      return;
    }

    await fulfillJson(route, mockedStockMovements, {
      "X-Total-Count": String(mockedStockMovements.length),
    });
  });
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

test("stock policy uses Sao Paulo civil date and evaluates optional legacy dates", () => {
  expect(formatStockMovementType("saida_entrega")).toBe("Saída para entrega");

  expect(
    formatSaoPauloTodayForInput(new Date("2026-07-15T02:59:00.000Z"))
  ).toBe("2026-07-14");
  expect(
    formatSaoPauloTodayForInput(new Date("2026-07-15T03:00:00.000Z"))
  ).toBe("2026-07-15");

  const nonTrackingWithoutDate = stockBatches.find((batch) => batch.id === 4)!;
  const nonTrackingExpired = stockBatches.find((batch) => batch.id === 6)!;
  const futureEntry = stockBatches.find((batch) => batch.id === 7)!;
  const referenceDate = new Date("2026-07-14T15:00:00.000Z");

  expect(
    getBatchExpirationStatus(nonTrackingWithoutDate, false, referenceDate)
  ).toMatchObject({ code: "not_tracked", blocksManualExit: false });
  expect(
    getBatchExpirationStatus(nonTrackingExpired, false, referenceDate)
  ).toMatchObject({ code: "expired", blocksManualExit: true });
  expect(isStockBatchReceived(stockBatches[0], referenceDate)).toBe(true);
  expect(isStockBatchReceived(futureEntry, referenceDate)).toBe(false);

  const laterEntry = { ...stockBatches[0], id: 20, entry_date: "2026-06-02" };
  const earlierEntry = { ...laterEntry, id: 21, entry_date: "2026-06-01" };
  const sameEntryLowerId = { ...earlierEntry, id: 19 };

  expect(compareStockBatchesByFefo(laterEntry, earlierEntry)).toBeGreaterThan(0);
  expect(
    compareStockBatchesByFefo(earlierEntry, sameEntryLowerId)
  ).toBeGreaterThan(0);
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

test("login brand and immediate navigation remain polished on desktop and mobile", async ({ page }) => {
  await page.setViewportSize({ width: 1365, height: 768 });
  await page.goto("/login");
  await expectLoginBrandSeparated(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expectLoginBrandSeparated(page);

  await page.getByLabel("Nome de login").fill("admin");
  await page.getByLabel("Senha").fill("Admin@123456");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.locator(".login-success-overlay")).toHaveCount(0);
  await expect(page.locator(".login-success-overlay__video")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: /Dashboard do Cesta Digital/i })
  ).toBeVisible({ timeout: 1_500 });
});

test("stale anonymous session check cannot undo a successful login", async ({
  page,
}) => {
  await page.unroute("**/auth/me");
  let requestCount = 0;
  let releaseStaleSession!: () => void;
  let confirmInitialRequest!: () => void;
  const staleSessionGate = new Promise<void>((resolve) => {
    releaseStaleSession = resolve;
  });
  const initialRequestStarted = new Promise<void>((resolve) => {
    confirmInitialRequest = resolve;
  });

  await page.route("**/auth/me", async (route) => {
    requestCount += 1;

    if (requestCount === 1) {
      confirmInitialRequest();
      await staleSessionGate;
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Sessão anônima." }),
      });
      return;
    }

    await fulfillJson(route, currentUser);
  });

  const staleSessionResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/auth/me") && response.status() === 401
  );
  await page.goto("/login");
  await initialRequestStarted;
  await page.getByLabel("Nome de login").fill("admin");
  await page.getByLabel("Senha").fill("Admin@123456");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(
    page.getByRole("heading", { name: /Dashboard do Cesta Digital/i })
  ).toBeVisible({ timeout: 1_500 });
  releaseStaleSession();
  await staleSessionResponse;
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: /Dashboard do Cesta Digital/i })
  ).toBeVisible();
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

test("reduced motion login never renders blocking overlay or video", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1365, height: 768 });
  await page.goto("/login");

  await page.getByLabel("Nome de login").fill("admin");
  await page.getByLabel("Senha").fill("Admin@123456");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.locator(".login-success-overlay")).toHaveCount(0);
  await expect(page.locator(".login-success-overlay__video")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: /Dashboard do Cesta Digital/i })
  ).toBeVisible({ timeout: 1_500 });
});

test("auth loading uses the brand symbol on desktop and mobile", async ({ page }) => {
  await page.unroute("**/auth/me");

  function createAuthResponseGate() {
    let confirmRequestStarted!: () => void;
    let releaseResponse!: () => void;
    const requestStarted = new Promise<void>((resolve) => {
      confirmRequestStarted = resolve;
    });
    const responseGate = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });

    return {
      requestStarted,
      responseGate,
      confirmRequestStarted,
      releaseResponse,
    };
  }

  let activeGate = createAuthResponseGate();
  await page.route("**/auth/me", async (route) => {
    const requestGate = activeGate;
    requestGate.confirmRequestStarted();
    await requestGate.responseGate;
    await fulfillJson(route, currentUser);
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  await activeGate.requestStarted;
  await expect(page.locator(".app-loading .brand-lockup--mark-only")).toBeVisible();
  activeGate.releaseResponse();
  await expect(page.getByRole("heading", { name: /Dashboard do Cesta Digital/i })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  activeGate = createAuthResponseGate();
  await page.reload();

  await activeGate.requestStarted;
  await expect(page.locator(".app-loading .brand-lockup--mark-only")).toBeVisible();
  activeGate.releaseResponse();
  await expect(page.getByRole("heading", { name: /Dashboard do Cesta Digital/i })).toBeVisible();
});

test("login, dashboard and core operational routes render", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Nome de login").fill("admin");
  await page.getByLabel("Senha").fill("Admin@123456");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.locator(".login-success-overlay")).toHaveCount(0);
  await expect(page.locator(".login-success-overlay__video")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: /Dashboard do Cesta Digital/i })
  ).toBeVisible({ timeout: 1_500 });
  await expect(
    page.locator("#conteudo-principal").getByText("Admin Homologacao")
  ).toBeVisible();

  const mainNav = page.getByLabel("Navegação principal");

  await mainNav.getByRole("link", { name: /Famílias/i }).click();
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

test("homologation warning remains visible before and after login", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("note", { name: "Aviso do ambiente" })).toContainText(
    /Ambiente de (homologação|staging|desenvolvimento)/
  );
  await expect(
    page.getByText("Use apenas dados fictícios ou anonimizados.", { exact: true })
  ).toBeVisible();

  await page.goto("/");

  await expect(page.getByRole("note", { name: "Aviso do ambiente" })).toBeVisible();
});

test("mobile stock entry completes without document overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const dashboardEntryLink = page
    .getByRole("link", { name: "Registrar entrada" })
    .first();
  await expect(dashboardEntryLink).toBeVisible();
  await dashboardEntryLink.click();

  const entryFormHasNoDocumentOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
  );
  expect(entryFormHasNoDocumentOverflow).toBe(true);

  await page
    .getByRole("combobox", { name: "Item", exact: true })
    .selectOption("1");
  await page.getByLabel("Data de validade do lote").fill("2099-12-31");
  await page.getByRole("button", { name: "Registrar entrada" }).click();

  await expect(page).toHaveURL(/\/items\/1$/);
  await expect(page.getByRole("heading", { level: 1, name: "Arroz 1kg" })).toBeVisible();
  const hasNoDocumentOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
  );
  expect(hasNoDocumentOverflow).toBe(true);

  await page.goto("/items");

  await expect(page.getByRole("heading", { level: 1, name: "Itens" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Registrar entrada" }).first()
  ).toBeVisible();
  const inactiveRow = page.getByRole("row", {
    name: /Farinha descontinuada/,
  });
  await expect(inactiveRow.getByText("Inativo", { exact: true })).toBeVisible();
  await expect(inactiveRow.getByText("Atenção", { exact: true })).toHaveCount(0);
  await expect(
    inactiveRow.getByRole("link", { name: "Registrar entrada" })
  ).toHaveCount(0);
});

test("item creation guides the first stock entry with conditional expiration", async ({
  page,
}) => {
  await page.goto("/items/new");

  await expect(
    page.getByText(
      "A data não pertence ao item. Ela será informada em cada entrada, conforme a embalagem recebida."
    )
  ).toBeVisible();

  await page.getByLabel("Categoria").selectOption("1");
  await page.getByLabel("Nome do item").fill("Feijao 1kg");
  const activeItemsRequestPromise = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname.endsWith("/items") && url.searchParams.get("is_active") === "true";
  });
  await page.getByRole("button", { name: "Cadastrar item" }).click();
  await activeItemsRequestPromise;

  await expect(page).toHaveURL(/\/stock-batches\/new\?itemId=2&from=item-create$/);
  await expect(page.getByRole("heading", { name: "Registrar entrada" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Item", exact: true })).toHaveValue("2");
  await expect(page.getByText(/Item cadastrado\. Registre agora/)).toBeVisible();

  const expirationField = page.getByLabel("Data de validade do lote");
  const entryDateField = page.getByLabel("Data de entrada");
  const entryDate = await entryDateField.inputValue();
  await expect(expirationField).toBeEnabled();
  await expect(expirationField).toHaveAttribute("required", "");
  await expect(entryDateField).toHaveAttribute("max", entryDate);
  await expect(expirationField).toHaveAttribute("min", entryDate);

  await entryDateField.fill("2099-01-01");
  await page.getByRole("button", { name: "Registrar entrada" }).click();
  const batchErrorSummary = page.locator("#stock-batch-form-error");
  await expect(entryDateField).toBeFocused();
  await expect(batchErrorSummary).toHaveText("A data de entrada não pode ser futura.");
  await expect(entryDateField).toHaveAttribute("aria-invalid", "true");
  await entryDateField.fill(entryDate);

  await expirationField.fill("2099-11-30");

  await page.getByRole("combobox", { name: "Item", exact: true }).selectOption("1");
  await expect(expirationField).toHaveValue("");

  await page.getByRole("combobox", { name: "Item", exact: true }).selectOption("3");
  await expect(expirationField).toBeDisabled();
  await expect(expirationField).toHaveValue("");
  await expect(page.getByText("Este item não controla validade; nenhuma data será enviada.")).toBeVisible();

  await page.getByRole("combobox", { name: "Item", exact: true }).selectOption("2");
  await expect(expirationField).toHaveAttribute("required", "");
  await expirationField.fill("2099-12-31");
  await page.getByLabel("Origem").selectOption("compra_igreja");

  const entryRequestPromise = page.waitForRequest(
    (request) =>
      request.url().endsWith("/stock-batches") && request.method() === "POST"
  );
  await page.getByRole("button", { name: "Registrar entrada" }).click();
  const entryRequest = await entryRequestPromise;

  expect(entryRequest.postDataJSON()).toMatchObject({
    item_id: 2,
    source_type: "compra_igreja",
    expiration_date: "2099-12-31",
  });
  await expect(page).toHaveURL(/\/items\/2$/);
  await expect(
    page.getByText(/Entrada registrada com sucesso\. O saldo foi atualizado/)
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Registrar entrada" }).first()
  ).toBeVisible();
  await expect(page.getByText("Saldo utilizável: 7")).toBeVisible();
  const createdEntryRow = page
    .getByRole("table", { name: "Lotes do item" })
    .getByRole("row", {
      name: /Compra com recursos da instituição.*31\/12\/2099/,
    });
  await expect(createdEntryRow).toBeVisible();
});

test("invalid stock entry item query never becomes a selectable payload", async ({
  page,
}) => {
  await page.goto("/stock-batches/new?itemId=invalido&from=item-create");

  await expect(page.getByRole("combobox", { name: "Item", exact: true })).toHaveValue("");
  await expect(
    page.getByText(
      "O item indicado não está disponível. Selecione um item válido para continuar."
    )
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Item", exact: true })
  ).toBeFocused();
  await expect(
    page.getByRole("combobox", { name: "Item", exact: true })
  ).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("button", { name: "Registrar entrada" })).toBeDisabled();
});

test("inactive item creation stays on detail without stock entry CTA", async ({ page }) => {
  await page.goto("/items/new");

  await page.getByLabel("Categoria").selectOption("1");
  await page.getByLabel("Nome do item").fill("Farinha nova");
  await page.getByLabel("Item ativo").uncheck();
  await page.getByRole("button", { name: "Cadastrar item" }).click();

  await expect(page).toHaveURL(/\/items\/2$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Farinha nova" })
  ).toBeVisible();
  await expect(
    page.getByText("Item inativo cadastrado. Ative-o antes de registrar uma entrada de estoque.")
  ).toBeVisible();
  await expect(page.getByText("Saldo utilizável: 0")).toBeVisible();
  await expect(page.getByRole("link", { name: "Registrar entrada" })).toHaveCount(0);
});

test("deactivating and reactivating an item recomputes usable stock", async ({ page }) => {
  await page.goto("/items/1");

  await expect(page.getByText("Saldo utilizável: 8")).toBeVisible();
  await page.getByLabel("Item ativo").uncheck();
  await page.getByRole("button", { name: "Salvar item" }).click();

  await expect(page.getByText("Item atualizado com auditoria registrada.")).toBeVisible();
  await expect(page.getByText("Saldo utilizável: 0")).toBeVisible();
  await expect(page.getByText("Status: Inativo")).toBeVisible();
  await expect(page.getByRole("link", { name: "Registrar entrada" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Ajustar saldo" })).toHaveCount(0);

  await page.getByLabel("Item ativo").check();
  await page.getByRole("button", { name: "Salvar item" }).click();

  await expect(page.getByText("Saldo utilizável: 8")).toBeVisible();
  await expect(page.getByText("Status: Ativo")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Registrar entrada" }).first()
  ).toBeVisible();
});

test("item detail explains expiration and highlights critical batches", async ({ page }) => {
  await page.unroute("**/stock-summary?**");
  await page.route("**/stock-summary?**", async (route) =>
    fulfillJson(route, [], { "X-Total-Count": "0" })
  );
  await page.goto("/items/1");

  await expect(page.getByRole("heading", { name: "Arroz 1kg" })).toBeVisible();
  await expect(page.getByText("Saldo utilizável: 8")).toBeVisible();
  await expect(page.getByText("2 lotes com validade crítica")).toBeVisible();
  await expect(page.getByText("1 lote com entrada futura")).toBeVisible();

  const batchesTable = page.getByRole("table", { name: "Lotes do item" });
  await expect(batchesTable.getByText("Doação de item")).toHaveCount(2);
  await expect(batchesTable.getByText("Vencido", { exact: true })).toBeVisible();
  await expect(
    batchesTable.getByText("Validade não informada", { exact: true })
  ).toBeVisible();
  await expect(
    batchesTable.getByText("Entrada futura", { exact: true })
  ).toBeVisible();
});

test("manual stock exit follows FEFO and keeps expired batch available for disposal", async ({
  page,
}) => {
  await page.goto("/stock-movements/new?itemId=1");
  await expect(
    page.getByRole("heading", { level: 1, name: "Movimentação manual" })
  ).toBeVisible();

  const batchSelect = page.getByRole("combobox", { name: "Lote", exact: true });
  const movementType = page.getByRole("combobox", { name: "Tipo", exact: true });
  const expiredOption = batchSelect.locator('option[value="2"]');
  const missingExpirationOption = batchSelect.locator('option[value="3"]');
  const futureEntryOption = batchSelect.locator('option[value="7"]');
  const validOption = batchSelect.locator('option[value="1"]');

  await expect(batchSelect).toHaveValue("1");
  await expect(batchSelect.locator("option").nth(1)).toHaveValue("1");
  await expect(expiredOption).toHaveAttribute("disabled", "");
  await expect(missingExpirationOption).toHaveAttribute("disabled", "");
  await expect(futureEntryOption).toHaveAttribute("disabled", "");
  await expect(futureEntryOption).toContainText("Entrada futura");

  await movementType.selectOption("perda_validade");
  await expect(expiredOption).not.toHaveAttribute("disabled", "");
  await expect(missingExpirationOption).not.toHaveAttribute("disabled", "");
  await expect(validOption).toHaveAttribute("disabled", "");
  await batchSelect.selectOption("2");
  await expect(page.locator(".detail-grid .pill")).toHaveText("Vencido");
  await page.getByRole("button", { name: "Registrar movimentação" }).click();
  const movementErrorSummary = page.locator("#stock-movement-form-error");
  await expect(page.getByLabel("Motivo da movimentação")).toBeFocused();
  await expect(movementErrorSummary).toHaveText(
    "Informe o motivo da movimentação para manter a auditoria completa."
  );
  await expect(page.getByLabel("Motivo da movimentação")).toHaveAttribute(
    "aria-invalid",
    "true"
  );
  await page
    .getByLabel("Motivo da movimentação")
    .fill("Descarte seguro de alimento vencido");
  await expect(
    page.getByRole("button", { name: "Registrar movimentação" })
  ).toBeEnabled();

  await movementType.selectOption("saida_manual");
  await expect(batchSelect).toHaveValue("");
  await expect(expiredOption).toHaveAttribute("disabled", "");

  await movementType.selectOption("perda_validade");
  await batchSelect.selectOption("2");
  const movementRequestPromise = page.waitForRequest(
    (request) =>
      request.url().endsWith("/stock-movements") && request.method() === "POST"
  );
  await page.getByRole("button", { name: "Registrar movimentação" }).click();
  const movementRequest = await movementRequestPromise;

  expect(movementRequest.postDataJSON()).toMatchObject({
    batch_id: 2,
    movement_type: "perda_validade",
  });
  await expect(page).toHaveURL(/\/items\/1$/);
  const updatedExpiredBatchRow = page
    .getByRole("table", { name: "Lotes do item" })
    .getByRole("row")
    .filter({ hasText: "#2" });
  await expect(updatedExpiredBatchRow.getByRole("cell").nth(3)).toHaveText("1");
  await expect(
    page
      .getByRole("table", { name: "Histórico de movimentações do item" })
      .getByRole("row", { name: /Perda por validade.*Descarte seguro/ })
  ).toBeVisible();

  await page.goto("/stock-movements/new?itemId=3");

  const nonTrackingBatchSelect = page.getByRole("combobox", {
    name: "Lote",
    exact: true,
  });
  await expect(nonTrackingBatchSelect).toHaveValue("4");
  await expect(
    nonTrackingBatchSelect.locator('option[value="6"]')
  ).toHaveAttribute("disabled", "");

  await page
    .getByRole("combobox", { name: "Tipo", exact: true })
    .selectOption("perda_validade");
  await expect(
    nonTrackingBatchSelect.locator('option[value="4"]')
  ).toHaveAttribute("disabled", "");
  await expect(
    nonTrackingBatchSelect.locator('option[value="6"]')
  ).not.toHaveAttribute("disabled", "");
});

test("movement clears invalid query and blocks batches from inactive items", async ({ page }) => {
  await page.goto("/stock-movements/new?itemId=1");
  const batchSelect = page.getByRole("combobox", { name: "Lote", exact: true });
  await expect(batchSelect).toHaveValue("1");

  await page.evaluate(() => {
    window.history.pushState({}, "", "/stock-movements/new?itemId=invalido");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });

  await expect(page).toHaveURL(/itemId=invalido$/);
  await expect(batchSelect).toHaveValue("");
  await expect(batchSelect.locator("option")).toHaveCount(1);
  await expect(
    page.getByText(
      "O item indicado não está disponível. Selecione um lote válido para continuar."
    )
  ).toBeVisible();

  await page.goto("/stock-movements/new?itemId=9");
  const inactiveBatchSelect = page.getByRole("combobox", {
    name: "Lote",
    exact: true,
  });
  await expect(inactiveBatchSelect).toHaveValue("");
  const inactiveBatchOption = inactiveBatchSelect.locator('option[value="8"]');
  await expect(inactiveBatchOption).toHaveAttribute("disabled", "");
  await expect(inactiveBatchOption).toContainText("Item inativo");
  await expect(
    page.getByRole("button", { name: "Registrar movimentação" })
  ).toBeDisabled();
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

  const navigation = page.getByLabel("Navegação principal");
  const navigationToggle = page.getByRole("button", { name: "Abrir menu" });

  await expect(navigation).toHaveAttribute("aria-hidden", "true");
  await expect(navigation).toHaveAttribute("inert", "");

  await navigationToggle.click();

  await expect(navigation).not.toHaveAttribute("aria-hidden");
  await expect(navigation).not.toHaveAttribute("inert");
  await expect(page.getByRole("button", { name: "Fechar menu" }).first()).toBeFocused();
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");

  await page.keyboard.press("Escape");

  await expect(navigation).toHaveAttribute("aria-hidden", "true");
  await expect(navigationToggle).toBeFocused();
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");

  await navigationToggle.click();
  await page
    .getByLabel("Navegação principal")
    .getByRole("link", { name: /Famílias/i })
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

  const mainNav = page.getByLabel("Navegação principal");
  await expect(mainNav.getByRole("link", { name: /Usuários/i })).toHaveCount(0);
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
  await page.getByLabel("E-mail de recuperação").fill("admin@cestadigital.app");
  await page.getByRole("button", { name: "Solicitar recuperação" }).click();

  await expect(
    page.getByText("Se o e-mail estiver cadastrado, a equipe poderá redefinir sua senha.")
  ).toBeVisible();
});
