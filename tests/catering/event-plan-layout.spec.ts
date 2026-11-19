import { expect, test } from "@playwright/test";

test("event planning dialog keeps address fields on one row and the add button level with the customer field", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  const claims = {
    exp: Math.floor(Date.now() / 1000) + 3600,
    tenantSlug: "default",
    modules: ["events"],
    accesses: ["events"],
    permissions: ["events.list", "events.create", "events.view"],
  };
  const token = [Buffer.from('{"alg":"none"}').toString("base64url"), Buffer.from(JSON.stringify(claims)).toString("base64url"), "test"].join(".");
  await page.addInitScript((value) => localStorage.setItem("auth_token", value), token);
  await page.route("**/api/**", (route) => route.fulfill({ json: { items: [], total: 0, data: { pageSizes: {} } } }));

  await page.goto("/catering/events");
  await page.getByRole("button", { name: "Dodaj wydarzenie", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Planowanie wydarzenia" });
  const street = dialog.getByRole("textbox", { name: "Ulica i numer" });
  const city = dialog.getByRole("textbox", { name: "Miejscowość" });
  const postal = dialog.getByRole("textbox", { name: "Kod pocztowy" });
  await expect(street).toBeVisible();
  const boxes = await Promise.all([street, city, postal].map((field) => field.locator("xpath=ancestor::div[contains(@class,'MuiOutlinedInput-root')]").boundingBox()));
  for (const box of boxes) expect(box).not.toBeNull();
  const [streetBox, cityBox, postalBox] = boxes as { x: number; y: number; width: number; height: number }[];
  expect(Math.abs(streetBox.y - cityBox.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(cityBox.y - postalBox.y)).toBeLessThanOrEqual(1);
  expect(streetBox.x + streetBox.width).toBeLessThanOrEqual(cityBox.x + 1);
  expect(cityBox.x + cityBox.width).toBeLessThanOrEqual(postalBox.x + 1);

  const input = dialog.getByRole("combobox", { name: "Klient / organizator" }).locator("xpath=ancestor::div[contains(@class,'MuiOutlinedInput-root')]");
  const button = dialog.getByRole("button", { name: "Dodaj kontrahenta", exact: true });
  const inputBox = await input.boundingBox();
  const buttonBox = await button.boundingBox();
  expect(inputBox).not.toBeNull();
  expect(buttonBox).not.toBeNull();
  expect(Math.abs(buttonBox!.y - inputBox!.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(buttonBox!.height - inputBox!.height)).toBeLessThanOrEqual(1);
});
