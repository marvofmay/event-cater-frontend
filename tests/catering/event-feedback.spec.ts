import { expect, test } from "@playwright/test";

test("event saves show toast errors on each attempt and success after navigation and editing", async ({ page }) => {
  const token = [
    Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url"),
    Buffer.from(JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + 3600,
      modules: ["events"], accesses: ["events"], permissions: ["events.*"],
      tenantSlug: "default",
    })).toString("base64url"),
    "test",
  ].join(".");
  await page.addInitScript(value => localStorage.setItem("auth_token", value), token);
  let attempts = 0;
  let event = {
    uuid: "00000000-0000-4000-8000-000000000001",
    title: "Przyjęcie testowe", date: "2026-12-31", timezone: "Europe/Warsaw",
    status: "draft", version: 1, number: "TEST/1",
    location: { venue: "", street: "", city: "", postalCode: "", instructions: "" },
    contacts: [], menu: [], staff: [], attachments: [],
  };
  await page.route("**/api/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/events" && request.method() === "POST") {
      attempts++;
      if (attempts <= 2) return route.fulfill({ status: 422, json: { message: "Nie udało się zapisać wydarzenia testowego." } });
      return route.fulfill({ status: 201, json: event });
    }
    if (path === "/api/events/" + event.uuid) {
      if (request.method() === "PUT") event = { ...event, ...request.postDataJSON(), version: event.version + 1 };
      return route.fulfill({ json: event });
    }
    return route.fulfill({ json: { items: [], total: 0 } });
  });
  await page.goto("/catering/events");
  await page.getByRole("button", { name: "Dodaj wydarzenie", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tytuł wydarzenia").fill(event.title);
  await dialog.getByRole("textbox", { name: "Data wydarzenia", exact: true }).fill(event.date);
  for (let attempt = 1; attempt <= 2; attempt++) {
    await dialog.getByRole("button", { name: "Utwórz wydarzenie", exact: true }).click();
    const error = page.locator(".Toastify__toast--error");
    await expect(error).toHaveCount(1);
    await expect(error).toContainText("Nie udało się zapisać wydarzenia testowego.");
    await expect(dialog.getByText("Nie udało się zapisać wydarzenia testowego.")).toHaveCount(0);
    await error.getByRole("button", { name: /close/i, includeHidden: true }).click();
    await expect(error).toHaveCount(0);
  }
  await dialog.getByRole("button", { name: "Utwórz wydarzenie", exact: true }).click();
  await expect(page).toHaveURL("/catering/events/" + event.uuid);
  const success = page.locator(".Toastify__toast--success");
  await expect(success).toContainText("Utworzono wydarzenie.");
  await success.getByRole("button", { name: /close/i }).click();
  await expect(success).toHaveCount(0);
  await page.getByLabel("Tytuł wydarzenia").fill("Zmieniony tytuł wydarzenia");
  await page.getByRole("button", { name: "Zapisz dane wydarzenia", exact: true }).click();
  await expect(success).toContainText("Zapisano dane wydarzenia.");
  await expect(page.getByRole("heading", { name: "Zmieniony tytuł wydarzenia", exact: true })).toBeVisible();
});
