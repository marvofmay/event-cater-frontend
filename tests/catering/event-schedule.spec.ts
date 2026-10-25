import { expect, test } from "@playwright/test";

test("schedule appears after choosing the event date and keeps overnight offsets", async ({ page }) => {
  const token = [
    Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url"),
    Buffer.from(JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + 3600,
      modules: ["events"], accesses: ["events"], permissions: ["events.*"],
      tenantSlug: "default",
    })).toString("base64url"),
    "test",
  ].join(".");
  await page.addInitScript((value) => localStorage.setItem("auth_token", value), token);
  await page.route("**/api/**", (route) => route.fulfill({ json: { items: [], total: 0 } }));
  await page.goto("/catering/events");
  await expect(page.getByRole("button", { name: "Dodaj wydarzenie", exact: true })).toHaveClass(/MuiButton-containedSuccess/);
  await page.getByRole("button", { name: "Dodaj wydarzenie", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Zamknij formularz" })).toHaveClass(/MuiButton-containedPrimary/);
  const date = dialog.getByRole("textbox", { name: "Data wydarzenia", exact: true });
  const readyDate = dialog.getByLabel(/^Data gotowości cateringu/);
  const startDate = dialog.getByLabel(/^Data początku wydawania/);
  const endDate = dialog.getByLabel(/^Data końca obsługi/);
  const ready = dialog.getByLabel("Gotowość cateringu", { exact: true });
  await expect(date).toHaveValue("");
  await expect(ready).toHaveCount(0);
  await date.fill("2026-12-31");
  for (const field of [readyDate, startDate, endDate]) {
    await expect(field).toHaveValue("2026-12-31");
  }
  await expect(ready).toHaveValue("");
  await ready.fill("18:00");
  await dialog.getByLabel("Początek wydawania", { exact: true }).fill("19:00");
  await endDate.fill("2027-01-01");
  await dialog.getByLabel("Koniec obsługi", { exact: true }).fill("02:00");
  await date.fill("2027-01-02");
  await expect(readyDate).toHaveValue("2027-01-02");
  await expect(startDate).toHaveValue("2027-01-02");
  await expect(endDate).toHaveValue("2027-01-03");
  await expect(ready).toHaveValue("18:00");
  await date.fill("");
  await expect(ready).toHaveCount(0);
});
