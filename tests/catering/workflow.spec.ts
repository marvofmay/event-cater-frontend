import { test, expect, Page } from "@playwright/test";

const email = process.env.CATERING_TEST_EMAIL;
const password = process.env.CATERING_TEST_PASSWORD;
const owner = process.env.CATERING_TEST_OWNER;
test.skip(
  !email || !password || !owner,
  "Set CATERING_TEST_EMAIL, CATERING_TEST_PASSWORD and CATERING_TEST_OWNER for an isolated development account.",
);

async function login(page: Page) {
  const response = await page.request.post("/api/login", {
    data: { email, password },
  });
  expect(response.ok()).toBeTruthy();
  const { token } = await response.json();
  await page.addInitScript(
    (token) => localStorage.setItem("auth_token", token),
    token,
  );
  return token as string;
}
async function lookup(page: Page, label: string, query: string) {
  await page.getByRole("combobox", { name: new RegExp(label) }).fill(query);
  await page.getByRole("option").filter({ hasText: query }).first().click();
}

test("saved venue → event menu → preparation → kitchen card, PDF and accepted revision", async ({
  page,
}) => {
  const token = await login(page);
  const code = Date.now().toString(36).toUpperCase();
  const venueName = `Test E2E Sala ${code}`;
  const eventName = `Test E2E Przyjęcie ${code}`;
  const templateName = `Test E2E Szablon ${code}`;
  const gearName = `Test E2E Bulionówka ${code}`;
  const productName = `Test E2E Mleko ${code}`;
  let eventUuid = "";
  const cleanup: { path: string; uuid: string }[] = [];
  try {
    await page.goto("/catering/venues");
    await page
      .getByRole("button", { name: "Dodaj miejsce", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nazwa miejsca", { exact: false }).fill(venueName);
    await dialog
      .getByLabel("Ulica i numer", { exact: false })
      .fill("Testowa 10");
    await dialog.getByLabel("Miejscowość", { exact: false }).fill("Kraków");
    await dialog.getByLabel("Kod pocztowy", { exact: false }).fill("30-001");
    await dialog
      .getByLabel("Dojazd, rozładunek i dostęp do zaplecza")
      .fill("Rozładunek od podwórza, bufet na parterze");
    await dialog.getByRole("button", { name: "Dodaj kontakt" }).click();
    await dialog.getByLabel("Osoba do kontaktu").fill("Testowy organizator");
    await dialog.getByLabel("Telefon").fill("123456789");
    const venueResponse = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/event-venues") &&
        r.request().method() === "POST",
    );
    await dialog
      .getByRole("button", { name: "Zapisz miejsce", exact: true })
      .click();
    const venueResult = await venueResponse;
    expect(venueResult.status()).toBe(201);
    const venue = await venueResult.json();
    cleanup.push({ path: "/event-venues", uuid: venue.uuid });
    await expect(dialog).toBeHidden();
    await expect(
      page.getByRole("cell", { name: venueName, exact: true }),
    ).toBeVisible();

    for (const item of [
      {
        route: "equipment",
        name: gearName,
        code: "BOWL-" + code,
        path: "/equipment",
      },
      {
        route: "supplies",
        name: productName,
        code: "MILK-" + code,
        path: "/consumables",
      },
    ]) {
      await page.goto("/catering/" + item.route);
      await page
        .getByRole("button", { name: "Dodaj pozycję", exact: true })
        .click();
      await dialog.getByLabel("Kod").fill(item.code);
      await dialog.getByLabel("Nazwa").fill(item.name);
      await dialog.getByLabel("Kategoria").fill("Testy techniczne");
      const response = page.waitForResponse(
        (r) =>
          r.url().endsWith("/api" + item.path) &&
          r.request().method() === "POST",
      );
      await dialog.getByRole("button", { name: "Zapisz", exact: true }).click();
      const created = await response;
      expect(created.status()).toBe(201);
      const catalog = await created.json();
      cleanup.push({ path: item.path, uuid: catalog.uuid });
      await expect(dialog).toBeHidden();
    }
    await page.goto("/catering/templates");
    await page
      .getByRole("button", { name: "Dodaj szablon", exact: true })
      .click();
    await dialog.getByLabel("Nazwa szablonu").fill(templateName);
    await lookup(page, "Pozycja katalogowa", gearName);
    await dialog
      .getByRole("button", { name: "Dodaj do szablonu", exact: true })
      .click();
    await dialog.getByRole("combobox", { name: /Sposób wyliczenia/ }).click();
    await page
      .getByRole("option", { name: "Na liczbę gości", exact: true })
      .click();
    await dialog.getByLabel("Na ilu gości").fill("1");
    await dialog.getByRole("combobox", { name: /Rodzaj pozycji/ }).click();
    await page.getByRole("option", { name: "Produkt", exact: true }).click();
    await lookup(page, "Pozycja katalogowa", productName);
    await dialog
      .getByRole("button", { name: "Dodaj do szablonu", exact: true })
      .click();
    await dialog.getByLabel("Ilość", { exact: false }).last().fill("20");
    const templateResponse = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/preparation-templates") &&
        r.request().method() === "POST",
    );
    await dialog
      .getByRole("button", { name: "Zapisz szablon", exact: true })
      .click();
    const templateResult = await templateResponse;
    expect(templateResult.status()).toBe(201);
    const template = await templateResult.json();
    cleanup.push({ path: "/preparation-templates", uuid: template.uuid });
    await expect(dialog).toBeHidden();
    await page.goto("/catering/events");
    await page
      .getByRole("button", { name: "Dodaj wydarzenie", exact: true })
      .click();
    await lookup(page, "Wczytaj zapisane miejsce", venueName);
    await expect(dialog.getByLabel("Ulica i numer")).toHaveValue("Testowa 10");
    await dialog.getByLabel("Tytuł wydarzenia").fill(eventName);
    await dialog.getByLabel("Data wydarzenia").fill("2026-12-31");
    await dialog.getByLabel("Liczba gości").fill("100");
    await dialog.getByLabel("Gotowość cateringu").fill("2026-12-31T11:00");
    await dialog.getByLabel("Początek wydawania").fill("2026-12-31T12:00");
    await dialog.getByLabel("Koniec obsługi").fill("2026-12-31T16:00");
    await dialog
      .getByRole("button", { name: "Utwórz wydarzenie", exact: true })
      .click();
    await page.waitForURL(/\/catering\/events\/[0-9a-f-]+$/);
    eventUuid = page.url().split("/").pop()!;
    await expect(
      page.getByRole("heading", { name: eventName, exact: true }),
    ).toBeVisible();
    await page
      .getByRole("navigation", { name: "Zakładki wydarzenia" })
      .getByRole("button", { name: "Kontakty", exact: true })
      .click();
    await expect(page.getByLabel("Osoba do kontaktu")).toHaveValue(
      "Testowy organizator",
    );
    await page
      .getByRole("navigation", { name: "Zakładki wydarzenia" })
      .getByRole("button", { name: "Menu", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Dodaj potrawę", exact: true })
      .click();
    await page.getByLabel("Potrawa").fill("Krem pomidorowy");
    await page.getByLabel("Liczba porcji").fill("100");
    await page.getByLabel("Wielkość porcji").fill("250 ml");
    await page.getByLabel("Sposób podania").fill("Bufet — bemar");
    await page.getByLabel("Diety, oddziel przecinkami").fill("wegetariańska");
    const menuSaved = page.waitForResponse(
      (r) => r.url().endsWith("/menu") && r.request().method() === "PUT",
    );
    await page
      .getByRole("button", { name: "Zapisz menu wydarzenia", exact: true })
      .click();
    expect((await menuSaved).status()).toBe(200);
    await expect(
      page.getByRole("button", { name: "Zapisz menu wydarzenia", exact: true }),
    ).toBeEnabled();

    await page
      .getByRole("navigation", { name: "Zakładki wydarzenia" })
      .getByRole("button", { name: "Kompletacja", exact: true })
      .click();
    await lookup(page, "Szablon kompletacji", templateName);
    await page
      .getByRole("button", { name: "Zastosuj szablon do listy", exact: true })
      .click();
    await expect(page.getByText(gearName)).toBeVisible();
    await lookup(page, "Odpowiedzialny za kompletację", owner!);
    await page
      .getByRole("button", {
        name: "Zapisz odpowiedzialność i termin",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("button", { name: "Zatwierdź listę", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Zatwierdź listę", exact: true })
      .click();
    await expect(page.getByText("Zatwierdzona")).toBeVisible();
    await page.getByLabel("Przygotowano").first().fill("100");
    await page.getByLabel("Załadowano").first().fill("100");
    await page
      .getByRole("button", { name: "Zapisz ilości", exact: true })
      .first()
      .click();
    await expect(page.getByText(/Przygotowano: 100.000/)).toBeVisible();

    await page
      .getByRole("navigation", { name: "Zakładki wydarzenia" })
      .getByRole("button", { name: "Kuchnia", exact: true })
      .click();
    await lookup(page, "Odpowiedzialny za kuchnię", owner!);
    await page.getByRole("combobox", { name: /Rodzaj obsługi/ }).click();
    await page
      .getByRole("option", { name: "W bazie firmy", exact: true })
      .click();
    await page.getByLabel("Dzień produkcji").fill("2026-12-30");
    await page
      .getByRole("button", {
        name: "Utwórz kartę z menu wydarzenia",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("button", { name: "Wydaj kartę do kuchni", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Wydaj kartę do kuchni", exact: true })
      .click();
    await expect(page.getByText("Wydane do kuchni")).toBeVisible();
    await page.getByLabel("Przygotowano pozycję 1").fill("100");
    await page.getByLabel("Przekazano").fill("100");
    await page
      .getByRole("button", { name: "Zapisz wykonanie", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Potwierdź gotowość potraw", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Potwierdź przekazanie do obsługi",
        exact: true,
      })
      .click();
    await expect(page.getByText("Przekazane", { exact: true })).toBeVisible();
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Pobierz kartę PDF", exact: true })
      .click();
    expect((await download).suggestedFilename()).toMatch(/\.pdf$/);

    await page
      .getByRole("navigation", { name: "Zakładki wydarzenia" })
      .getByRole("button", { name: "Menu", exact: true })
      .click();
    await page.getByLabel("Liczba porcji").fill("120");
    const changedMenuResponse = page.waitForResponse(
      (r) => r.url().endsWith("/menu") && r.request().method() === "PUT",
    );
    await page
      .getByRole("button", { name: "Zapisz menu wydarzenia", exact: true })
      .click();
    expect((await changedMenuResponse).status()).toBe(200);
    await expect(
      page.getByRole("button", { name: "Zapisz menu wydarzenia", exact: true }),
    ).toBeEnabled();
    await expect(page.getByLabel("Liczba porcji")).toHaveValue("120");
    await page
      .getByRole("navigation", { name: "Zakładki wydarzenia" })
      .getByRole("button", { name: "Kuchnia", exact: true })
      .click();
    await expect(page.getByText(/Wydarzenie zmieniło się/)).toBeVisible();
    await page
      .getByRole("button", { name: "Zaproponuj zmianę karty", exact: true })
      .click();
    await page.getByLabel("Planowane porcje").fill("120");
    await page
      .getByLabel("Powód zmiany (min. 10 znaków)")
      .fill("Dodatkowych dwadzieścia osób na przyjęciu");
    await page
      .getByRole("button", {
        name: "Przekaż propozycję do akceptacji kuchni",
        exact: true,
      })
      .click();
    await expect(page.getByText(/100 → 120 porcji/)).toBeVisible();
    await page
      .getByRole("button", { name: "Akceptuj zmianę", exact: true })
      .click();
    await expect(page.getByText(/Rewizja 2/)).toBeVisible();
    await expect(
      page.getByText(/Przygotowano: 100 · przekazano: 100/),
    ).toBeVisible();
    await page.screenshot({
      path:
        process.env.CATERING_SCREENSHOT || "test-results/catering/kitchen.png",
      fullPage: true,
    });
    const eventResponse = await page.request.get("/api/events/" + eventUuid, {
      headers: { Authorization: "Bearer " + token },
    });
    const saved = await eventResponse.json();
    expect(saved.location.street).toBe("Testowa 10");
    expect(saved.readyAt).toBe("2026-12-31T10:00:00+00:00");
  } finally {
    const headers = { Authorization: "Bearer " + token };
    if (eventUuid) {
      const k = await page.request.get(
        "/api/events/" + eventUuid + "/kitchen-orders",
        { headers },
      );
      if (k.ok()) {
        const card = await k.json();
        await page.request.post(
          "/api/kitchen-orders/" + card.uuid + "/cancel",
          {
            headers,
            data: {
              version: card.version,
              reason: "Zakończenie technicznego testu przeglądarki",
            },
          },
        );
      }
      const response = await page.request.get("/api/events/" + eventUuid, {
        headers,
      });
      if (response.ok()) {
        const event = await response.json();
        await page.request.post("/api/events/" + eventUuid + "/status", {
          headers,
          data: { version: event.version, status: "cancelled" },
        });
      }
    }
    for (const item of cleanup) {
      const response = await page.request.get(
        "/api" + item.path + "/" + item.uuid,
        { headers },
      );
      if (response.ok()) {
        const value = await response.json();
        await page.request.put(
          "/api" + item.path + "/" + item.uuid + "/active",
          { headers, data: { version: value.version, active: false } },
        );
      }
    }
  }
});

test("removing one dish keeps the other dietary variant and its client form state", async ({
  page,
}) => {
  const token = await login(page);
  const headers = { Authorization: "Bearer " + token };
  const response = await page.request.post("/api/events", {
    headers,
    data: {
      title: "Test E2E Warianty " + Date.now(),
      date: "2026-12-31",
      guestCount: 10,
    },
  });
  expect(response.status()).toBe(201);
  const event = await response.json();
  try {
    const menu = await page.request.put("/api/events/" + event.uuid + "/menu", {
      headers,
      data: {
        version: event.version,
        items: [
          {
            name: "Zupa",
            portions: 9,
            diets: ["standard"],
            allergens: ["mleko"],
          },
          { name: "Zupa", portions: 1, diets: ["wegańska"], allergens: [] },
        ],
      },
    });
    expect(menu.ok()).toBeTruthy();
    await page.goto("/catering/events/" + event.uuid);
    await page
      .getByRole("navigation", { name: "Zakładki wydarzenia" })
      .getByRole("button", { name: "Menu", exact: true })
      .click();
    await expect(
      page.getByLabel("Diety, oddziel przecinkami").nth(1),
    ).toHaveValue("wegańska");
    await page
      .getByRole("button", { name: "Usuń potrawę", exact: true })
      .first()
      .click();
    await expect(page.getByLabel("Diety, oddziel przecinkami")).toHaveValue(
      "wegańska",
    );
    await expect(page.getByLabel("Liczba porcji")).toHaveValue("1");
    const saved = page.waitForResponse(
      (r) => r.url().endsWith("/menu") && r.request().method() === "PUT",
    );
    await page
      .getByRole("button", { name: "Zapisz menu wydarzenia", exact: true })
      .click();
    const data = await (await saved).json();
    expect(data.menu).toHaveLength(1);
    expect(data.menu[0].diets).toEqual(["wegańska"]);
    expect(data.menu[0]).not.toHaveProperty("clientId");
  } finally {
    const current = await (
      await page.request.get("/api/events/" + event.uuid, { headers })
    ).json();
    await page.request.post("/api/events/" + event.uuid + "/status", {
      headers,
      data: { version: current.version, status: "cancelled" },
    });
  }
});

test("a conflict preserves unsaved form values until the user chooses to refresh", async ({
  page,
}) => {
  const token = await login(page);
  const headers = { Authorization: "Bearer " + token };
  const original = "Test E2E Konflikt " + Date.now();
  const response = await page.request.post("/api/events", {
    headers,
    data: { title: original, date: "2026-12-31", guestCount: 10 },
  });
  expect(response.status()).toBe(201);
  const event = await response.json();
  try {
    await page.goto("/catering/events/" + event.uuid);
    await expect(page.getByLabel("Tytuł wydarzenia")).toHaveValue(original);
    await page.getByLabel("Tytuł wydarzenia").fill(original + " po edycji");
    const concurrent = await page.request.put(
      "/api/events/" + event.uuid + "/menu",
      {
        headers,
        data: {
          version: event.version,
          items: [{ name: "Danie z drugiego okna", portions: 10 }],
        },
      },
    );
    expect(concurrent.ok()).toBeTruthy();
    await page
      .getByRole("button", { name: "Zapisz dane wydarzenia", exact: true })
      .click();
    await expect(
      page.getByText(/Dane zmieniły się od ich wczytania/),
    ).toBeVisible();
    await expect(page.getByLabel("Tytuł wydarzenia")).toHaveValue(
      original + " po edycji",
    );
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", { name: "Odśwież wydarzenie", exact: true })
      .click();
    await expect(page.getByLabel("Tytuł wydarzenia")).toHaveValue(original);
    const saved = await (
      await page.request.get("/api/events/" + event.uuid, { headers })
    ).json();
    expect(saved.menu[0].name).toBe("Danie z drugiego okna");
  } finally {
    const current = await (
      await page.request.get("/api/events/" + event.uuid, { headers })
    ).json();
    await page.request.post("/api/events/" + event.uuid + "/status", {
      headers,
      data: { version: current.version, status: "cancelled" },
    });
  }
});

test("signed-out visitors cannot see catering creation forms", async ({
  page,
}) => {
  await page.goto("/catering/venues");
  await expect(
    page.getByText("Zaloguj się, aby korzystać z cateringu."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Dodaj miejsce", exact: true }),
  ).toHaveCount(0);
  await page.goto("/catering/kitchen");
  await expect(
    page.getByText("Zaloguj się, aby korzystać z cateringu."),
  ).toBeVisible();
});

test("event staff can have multiple functions and media uploads pass through the authenticated proxy", async ({
  page,
}) => {
  const token = await login(page);
  const headers = { Authorization: "Bearer " + token };
  const response = await page.request.post("/api/events", {
    headers,
    data: {
      title: "Test E2E Obsługa i zdjęcia " + Date.now(),
      date: "2026-12-31",
      guestCount: 10,
      readyAt: "2026-12-31T11:00:00+01:00",
      startsAt: "2026-12-31T12:00:00+01:00",
      endsAt: "2026-12-31T16:00:00+01:00",
    },
  });
  expect(response.status()).toBe(201);
  const event = await response.json();
  try {
    await page.goto("/catering/events/" + event.uuid);
    await page
      .getByRole("navigation", { name: "Zakładki wydarzenia" })
      .getByRole("button", { name: "Zespół", exact: true })
      .click();
    await lookup(page, "Pracownik", owner!);
    await page.getByLabel("Kierowca").check();
    await page.getByLabel("Praca od").fill("2026-12-31T10:00");
    await page.getByLabel("Praca do").fill("2026-12-31T17:00");
    const assigned = page.waitForResponse(
      (r) => r.url().includes("/staff/") && r.request().method() === "PUT",
    );
    await page
      .getByRole("button", { name: "Zapisz przydział pracownika", exact: true })
      .click();
    const assignedResponse = await assigned;
    expect(assignedResponse.status()).toBe(200);
    const staff = await assignedResponse.json();
    expect(staff.staff[0].functions).toEqual(
      expect.arrayContaining(["waiter", "driver"]),
    );
    await expect(
      page.getByRole("button", { name: "Zmień przydział", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("navigation", { name: "Zakładki wydarzenia" })
      .getByRole("button", { name: "Zdjęcia i filmy", exact: true })
      .click();
    const png = Buffer.concat([
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS1cAAAAASUVORK5CYII=",
        "base64",
      ),
      Buffer.alloc(3 * 1024 * 1024),
    ]);
    await page.getByLabel("Zdjęcie lub film").setInputFiles({
      name: "test-event.png",
      mimeType: "image/png",
      buffer: png,
    });
    await page
      .getByLabel("Opis materiału")
      .fill("Techniczne zdjęcie przyjęcia");
    const uploaded = page.waitForResponse(
      (r) =>
        r.url().endsWith("/attachments") && r.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Dodaj materiał", exact: true })
      .click();
    expect((await uploaded).status()).toBe(201);
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Pobierz", exact: true }).click();
    expect((await download).suggestedFilename()).toBe("test-event.png");
    await page
      .getByRole("button", { name: "Usuń załącznik", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Potwierdź usunięcie", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Pobierz", exact: true }),
    ).toHaveCount(0);
  } finally {
    const current = await (
      await page.request.get("/api/events/" + event.uuid, { headers })
    ).json();
    await page.request.post("/api/events/" + event.uuid + "/status", {
      headers,
      data: { version: current.version, status: "cancelled" },
    });
  }
});
