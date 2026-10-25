import { expect, test } from "@playwright/test";

test("products select a category from the library and reflect category renames", async ({ page }) => {
  const token = [
    Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url"),
    Buffer.from(JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + 3600,
      modules: ["supplies"], accesses: ["consumables"], permissions: ["consumables.*"],
      tenantSlug: "default",
    })).toString("base64url"),
    "test",
  ].join(".");
  await page.addInitScript((value) => localStorage.setItem("auth_token", value), token);
  const categories = [
    { uuid: "00000000-0000-4000-8000-000000000001", name: "Napoje i dodatki", version: 1 },
    { uuid: "00000000-0000-4000-8000-000000000002", name: "Opakowania", version: 1 },
  ];
  const products: { uuid: string; code: string; name: string; categoryUuid: string; unit: string; active: boolean; version: number }[] = [];
  await page.route("**/api/**", (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const body = request.postData() ? request.postDataJSON() : {};
    if (url.pathname.startsWith("/api/consumable-categories")) {
      if (request.method() === "PUT") {
        const category = categories.find((entry) => url.pathname.endsWith(entry.uuid))!;
        category.name = body.name;
        category.version++;
        return route.fulfill({ json: category });
      }
      const query = (url.searchParams.get("q") || "").toLowerCase();
      const items = categories.filter((category) => category.name.toLowerCase().includes(query));
      return route.fulfill({ json: { items, total: items.length } });
    }
    if (url.pathname === "/api/consumables") {
      if (request.method() === "POST") {
        expect(body.categoryUuid).toBe(categories[0].uuid);
        const product = { ...body, uuid: "00000000-0000-4000-8000-000000000003", active: true, version: 1 };
        products.push(product);
        return route.fulfill({ status: 201, json: product });
      }
      const categoryUuid = url.searchParams.get("categoryUuid");
      const items = products.filter((product) => !categoryUuid || product.categoryUuid === categoryUuid)
        .map((product) => ({ ...product, category: categories.find((category) => category.uuid === product.categoryUuid)?.name }));
      return route.fulfill({ json: { items, total: items.length } });
    }
    return route.fulfill({ json: { items: [], total: 0 } });
  });
  await page.goto("/catering/supplies");
  await page.getByRole("button", { name: "Dodaj pozycję", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Kod").fill("MILK");
  await dialog.getByLabel(/^Nazwa(?:\s*\*)?$/).fill("Mleko 1 l");
  await expect(dialog.getByRole("button", { name: "Zapisz", exact: true })).toBeDisabled();
  await dialog.getByRole("combobox", { name: "Kategoria produktu" }).click();
  await page.getByRole("option", { name: "Napoje i dodatki", exact: true }).click();
  await dialog.getByRole("button", { name: "Zapisz", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("row").filter({ hasText: "MILK" })).toContainText("Napoje i dodatki");
  await page.getByRole("link", { name: "Kategorie produktów", exact: true }).click();
  const info = page.getByRole("button", { name: "Informacje o kategoriach produktów" });
  await info.hover();
  await expect(page.getByRole("tooltip")).toContainText("Grupy produktów i materiałów");
  const row = page.getByRole("row").filter({ hasText: "Napoje i dodatki" });
  await expect(row.getByRole("cell").first()).toHaveClass(/MuiTableCell-sizeSmall/);
  await row.getByRole("button", { name: "Edytuj", exact: true }).click();
  await dialog.getByLabel("Nazwa kategorii").fill("Dodatki do napojów");
  await dialog.getByRole("button", { name: "Zapisz kategorię", exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("link", { name: "Wróć do produktów" }).click();
  await expect(page.getByRole("row").filter({ hasText: "MILK" })).toContainText("Dodatki do napojów");
  await page.getByRole("combobox", { name: "Filtruj kategorię produktu" }).click();
  await page.getByRole("option", { name: "Opakowania", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: "MILK" })).toHaveCount(0);
});
