import { expect, Page, test } from "@playwright/test";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS1cAAAAASUVORK5CYII=", "base64");
const category = { uuid: "00000000-0000-4000-8000-000000000001", name: "Urządzenia grzewcze", version: 1 };
type Photo = { uuid: string; name: string; mimeType: string; size: number; createdAt: string };
type Item = { uuid: string; code: string; name: string; categoryUuid: string; category: string; unit: string; active: boolean; version: number; photos: Photo[] };

async function setup(page: Page, failSecondUpload = false) {
  const token = [
    Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url"),
    Buffer.from(JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + 3600,
      modules: ["equipment"], accesses: ["equipment"], permissions: ["equipment.*"],
      tenantSlug: "default",
    })).toString("base64url"),
    "test",
  ].join(".");
  await page.addInitScript((value) => localStorage.setItem("auth_token", value), token);
  const state: { item: Item | null; creates: number; photoReads: number } = { item: null, creates: 0, photoReads: 0 };
  await page.route("**/api/**", (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    if (url.pathname === "/api/equipment-categories") {
      return route.fulfill({ json: { items: [category], total: 1 } });
    }
    if (url.pathname.includes("/photos")) {
      const item = state.item!;
      if (method === "GET") {
        expect(request.headers().authorization).toBe("Bearer " + token);
        state.photoReads++;
        return route.fulfill({ contentType: "image/png", body: png });
      }
      if (method === "POST") {
        const body = request.postDataBuffer()!.toString();
        expect(body).toContain('name="version"\r\n\r\n' + item.version);
        const name = body.match(/filename="([^"]+)"/)![1];
        if (failSecondUpload && name === "warnik-z-boku.png") {
          failSecondUpload = false;
          return route.fulfill({ status: 422, json: { message: "Nie udało się przesłać drugiego zdjęcia." } });
        }
        item.photos.push({ uuid: crypto.randomUUID(), name, mimeType: "image/png", size: png.length, createdAt: new Date().toISOString() });
      } else {
        expect(request.postDataJSON().version).toBe(item.version);
        item.photos = item.photos.filter((photo) => !url.pathname.endsWith(photo.uuid));
      }
      item.version++;
      return route.fulfill({ status: method === "POST" ? 201 : 200, json: item });
    }
    if (url.pathname.startsWith("/api/equipment")) {
      if (method === "POST") {
        state.creates++;
        state.item = { ...request.postDataJSON(), uuid: "00000000-0000-4000-8000-000000000002", category: category.name, active: true, version: 1, photos: [] };
        return route.fulfill({ status: 201, json: state.item });
      }
      if (method === "PUT") {
        expect(request.postDataJSON().version).toBe(state.item!.version);
        state.item = { ...state.item!, ...request.postDataJSON(), version: state.item!.version + 1 };
        return route.fulfill({ json: state.item });
      }
      if (state.item && url.pathname.endsWith(state.item.uuid)) return route.fulfill({ json: state.item });
      return route.fulfill({ json: { items: state.item ? [state.item] : [], total: state.item ? 1 : 0 } });
    }
    return route.fulfill({ json: { items: [], total: 0 } });
  });
  await page.goto("/catering/equipment");
  await page.getByRole("button", { name: "Dodaj pozycję", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Kod").fill("HEATER");
  await dialog.getByLabel(/^Nazwa(?:\s*\*)?$/).fill("Warnik na wodę");
  await dialog.getByRole("combobox", { name: "Kategoria sprzętu" }).click();
  await page.getByRole("option", { name: category.name, exact: true }).click();
  await dialog.locator('input[type="file"]').setInputFiles([
    { name: "warnik.png", mimeType: "image/png", buffer: png },
    { name: "warnik-z-boku.png", mimeType: "image/png", buffer: png },
  ]);
  await expect(dialog.getByRole("img", { name: "warnik.png", exact: true })).toBeVisible();
  return state;
}

test("equipment photos upload during creation, display in a private gallery and can be removed", async ({ page }) => {
  const state = await setup(page);
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Zapisz", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(state.item?.photos).toHaveLength(2);
  const row = page.getByRole("row").filter({ hasText: "HEATER" });
  await expect(row.getByRole("img")).toBeVisible();
  await row.getByRole("button", { name: "Zdjęcia sprzętu" }).click();
  await expect(dialog.getByRole("img")).toHaveCount(2);
  await expect.poll(() => state.photoReads).toBeGreaterThanOrEqual(3);
  await dialog.getByRole("button", { name: "Zamknij", exact: true }).click();
  await row.getByRole("button", { name: "Edytuj", exact: true }).click();
  await dialog.getByRole("button", { name: "Usuń zdjęcie: warnik.png", exact: true }).click();
  await dialog.getByRole("button", { name: "Zapisz", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(state.item?.photos.map((photo) => photo.name)).toEqual(["warnik-z-boku.png"]);
});

test("retrying a failed second photo preserves the equipment and the first photo", async ({ page }) => {
  const state = await setup(page, true);
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Zapisz", exact: true }).click();
  await expect(dialog).toContainText("Nie udało się przesłać drugiego zdjęcia.");
  expect(state.creates).toBe(1);
  expect(state.item?.photos).toHaveLength(1);
  await dialog.getByRole("button", { name: "Zapisz", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(state.creates).toBe(1);
  expect(state.item?.photos.map((photo) => photo.name)).toEqual(["warnik.png", "warnik-z-boku.png"]);
});
