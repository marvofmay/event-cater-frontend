import { expect, Page, test } from "@playwright/test";

const roleUuid = "00000000-0000-4000-8000-000000000001";
const eventUuid = "00000000-0000-4000-8000-000000000002";
const listUuid = "00000000-0000-4000-8000-000000000003";
const menuUuid = "00000000-0000-4000-8000-000000000004";
const availablePermissions = [{ uuid: listUuid, name: "list" }, { uuid: menuUuid, name: "plan_event_menu" }];

async function setup(page: Page, permissions = ["roles.*"], initiallyAssigned = false, failCatalog = false) {
  const token = [
    Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url"),
    Buffer.from(JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + 3600, tenantSlug: "mapa-smakow", tenantName: "Mapa Smaków",
      modules: ["company"], accesses: ["roles"], permissions,
    })).toString("base64url"),
    "test",
  ].join(".");
  await page.addInitScript(value => localStorage.setItem("auth_token", value), token);
  const access = { uuid: eventUuid, name: "events", module: { uuid: "module-events", name: "events" }, availablePermissions };
  let assigned = initiallyAssigned ? [{ ...access, permissions: [availablePermissions[0]] }] : [];
  const writes: { method: string; body: { accesses: { accessUUID: string; permissionsUUIDs: string[] }[] } }[] = [];
  let rejectNextSave = false;
  await page.route("**/api/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/auth/authorization") return route.fulfill({ json: { modules: ["company"], accesses: ["roles"], permissions } });
    if (path === "/api/roles") return route.fulfill({ json: { data: { items: [{ uuid: roleUuid, name: "Pracownik", createdAt: "2026-10-25 12:00:00" }], total: 1 } } });
    if (path === "/api/accesses") return route.fulfill({ status: failCatalog ? 500 : 200, json: { data: [access], message: "Błąd katalogu" } });
    if (path === "/api/roles/" + roleUuid) return route.fulfill({ json: { data: { uuid: roleUuid, name: "Pracownik", accesses: assigned } } });
    if (path === `/api/roles/${roleUuid}/accesses` && request.method() !== "GET") {
      const body = request.postDataJSON();
      writes.push({ method: request.method(), body });
      if (rejectNextSave) {
        rejectNextSave = false;
        return route.fulfill({ status: 422, json: { message: "Nie zapisano uprawnień. Spróbuj ponownie." } });
      }
      assigned = body.accesses.map((selection: { permissionsUUIDs: string[] }) => ({ ...access, permissions: availablePermissions.filter(permission => selection.permissionsUUIDs.includes(permission.uuid)) }));
      return route.fulfill({ json: { message: "Zapisano uprawnienia roli." } });
    }
    return route.fulfill({ json: { items: [], total: 0 } });
  });
  await page.goto("/manage/roles/list");
  await page.getByRole("cell", { name: "Pracownik", exact: true }).waitFor();
  return { writes, failNextSave: () => { rejectNextSave = true; } };
}

test("role editor uses one atomic save, preserves edits on error and reloads saved permissions", async ({ page }) => {
  const { writes, failNextSave } = await setup(page);
  const open = () => page.getByRole("button", { name: "przypisz dostępy i uprawnienia" }).click();
  await open();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("wydarzenia", { exact: true }).check();
  await dialog.getByLabel("planowanie menu", { exact: true }).check();
  failNextSave();
  await dialog.getByRole("button", { name: /^zapisz$/i, exact: true }).click();
  await expect(page.locator(".Toastify__toast--error")).toContainText("Nie zapisano uprawnień.");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("planowanie menu", { exact: true })).toBeChecked();
  expect(writes).toEqual([{ method: "PUT", body: { accesses: [{ accessUUID: eventUuid, permissionsUUIDs: [menuUuid] }] } }]);
  await dialog.getByRole("button", { name: /^zapisz$/i, exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator(".Toastify__toast--success")).toContainText("Zapisano uprawnienia roli.");
  expect(writes).toHaveLength(2);
  await open();
  await expect(dialog.getByLabel("planowanie menu", { exact: true })).toBeChecked();
  await expect(dialog.getByLabel("lista", { exact: true })).not.toBeChecked();
  await dialog.getByLabel("Wszystkie czynności", { exact: true }).check();
  await expect(dialog.getByLabel("lista", { exact: true })).toBeChecked();
  await dialog.getByRole("button", { name: /^zapisz$/i, exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(writes[2].body.accesses[0].permissionsUUIDs).toEqual([listUuid, menuUuid]);
  await open();
  await dialog.getByLabel("wydarzenia", { exact: true }).uncheck();
  await dialog.getByRole("button", { name: /^zapisz$/i, exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(writes[3].body.accesses).toEqual([]);
});

test("permission-only delegate can change actions but cannot remove the access", async ({ page }) => {
  const { writes } = await setup(page, ["roles.list", "roles.view", "roles.assign_permission_to_access_role"], true);
  await page.getByRole("button", { name: "przypisz dostępy i uprawnienia" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("wydarzenia", { exact: true })).toBeChecked();
  await expect(dialog.getByLabel("wydarzenia", { exact: true })).toBeDisabled();
  await dialog.getByLabel("planowanie menu", { exact: true }).check();
  await dialog.getByRole("button", { name: /^zapisz$/i, exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(writes[0].body.accesses[0].permissionsUUIDs).toEqual([listUuid, menuUuid]);
});

test("failed catalog load blocks saving instead of clearing existing permissions", async ({ page }) => {
  const { writes } = await setup(page, ["roles.*"], true, true);
  await page.getByRole("button", { name: "przypisz dostępy i uprawnienia" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("alert")).toContainText("Nie udało się wczytać");
  await expect(dialog.getByRole("button", { name: /^zapisz$/i, exact: true })).toBeDisabled();
  expect(writes).toEqual([]);
});

test("a role viewer cannot open the access editor", async ({ page }) => {
  await setup(page, ["roles.list", "roles.view"]);
  await expect(page.getByRole("button", { name: "przypisz dostępy i uprawnienia" })).toHaveCount(0);
  await page.getByRole("button", { name: "podgląd", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("returning to the tab refreshes permissions instead of trusting the old JWT", async ({ page }) => {
  const permissions = ["roles.list", "roles.view", "roles.assign_permission_to_access_role"];
  await setup(page, permissions);
  const editor = page.getByRole("button", { name: "przypisz dostępy i uprawnienia" });
  await expect(editor).toBeVisible();
  permissions.splice(0, permissions.length, "roles.list", "roles.view");
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(editor).toHaveCount(0);
  await expect(page.getByRole("cell", { name: "Pracownik", exact: true })).toBeVisible();
});
