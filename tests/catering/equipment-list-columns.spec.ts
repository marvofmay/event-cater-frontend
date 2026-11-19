import { expect, test } from "@playwright/test";

test("equipment quantity and storage columns do not overlap", async ({ page }) => {
  const token = [
    Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url"),
    Buffer.from(JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + 3600,
      modules: ["equipment"],
      accesses: ["equipment"],
      permissions: ["equipment.*"],
      tenantSlug: "default",
    })).toString("base64url"),
    "test",
  ].join(".");
  await page.setViewportSize({ width: 1110, height: 900 });
  await page.addInitScript((value) => localStorage.setItem("auth_token", value), token);
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/equipment" && route.request().method() === "GET") {
      return route.fulfill({
        json: {
          items: [{
            uuid: "00000000-0000-4000-8000-000000000201",
            code: "ST-12",
            name: "Stół bankietowy",
            slangName: "Bankiet",
            stockQuantity: 24,
            unit: "piece",
            storageLocation: "Magazyn główny, regał przy rampie",
            category: "Meble",
            active: true,
            version: 1,
            photos: [],
          }],
          total: 1,
          page: 1,
          limit: 20,
        },
      });
    }
    return route.fulfill({ json: { items: [], total: 0, data: { pageSizes: {} } } });
  });

  await page.goto("/catering/equipment");
  const quantity = page.getByRole("columnheader", { name: "Ilość posiadana", exact: true });
  const place = page.getByRole("columnheader", { name: "Miejsce przechowywania", exact: true });
  await expect(quantity).toBeVisible();
  await expect(place).toBeVisible();

  const boxes = async () => {
    const left = await quantity.boundingBox();
    const right = await place.boundingBox();
    expect(left).not.toBeNull();
    expect(right).not.toBeNull();
    return { left: left!, right: right! };
  };
  const desktop = await boxes();
  expect(desktop.left.x + desktop.left.width).toBeLessThanOrEqual(desktop.right.x + 1);
  for (const header of [quantity, place]) {
    const clipped = await header.evaluate((cell) => cell.scrollWidth > cell.clientWidth + 1 || cell.scrollHeight > cell.clientHeight + 1);
    expect(clipped).toBe(false);
  }

  for (const width of [1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const wide = await boxes();
    expect(wide.left.x + wide.left.width).toBeLessThanOrEqual(wide.right.x + 1);
    for (const header of [quantity, place]) {
      const clipped = await header.evaluate((cell) => cell.scrollWidth > cell.clientWidth + 1 || cell.scrollHeight > cell.clientHeight + 1);
      expect(clipped).toBe(false);
    }
  }
});
