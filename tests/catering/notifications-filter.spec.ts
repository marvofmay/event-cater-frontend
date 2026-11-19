import { expect, test } from "@playwright/test";

test("notification read filter is a segmented radio", async ({ page }) => {
  const claims = {
    exp: Math.floor(Date.now() / 1000) + 3600,
    modules: ["system"],
    accesses: ["notifications"],
    permissions: ["notifications.list"],
  };
  const token = [
    Buffer.from('{"alg":"none"}').toString("base64url"),
    Buffer.from(JSON.stringify(claims)).toString("base64url"),
    "test",
  ].join(".");
  await page.addInitScript((value) => localStorage.setItem("auth_token", value), token);
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/preferences") {
      return route.fulfill({ json: { data: { tenant: { pageSize: 25 }, user: { pageSize: null }, effective: { pageSize: 25 } } } });
    }
    if (path === "/api/notification-messages") {
      return route.fulfill({ json: { data: { items: [], total: 0 } } });
    }
    return route.fulfill({ json: { items: [], total: 0, unreadCount: 0, data: { pageSizes: {} } } });
  });

  await page.goto("/notifications");
  const group = page.getByRole("radiogroup", { name: "Filtr przeczytania" });
  const all = group.getByRole("radio", { name: "Wszystkie", exact: true });
  const unread = group.getByRole("radio", { name: "Nieprzeczytane", exact: true });
  await expect(group.getByRole("radio")).toHaveCount(3);
  await expect(all).toHaveAttribute("aria-checked", "true");
  await expect(all).toHaveCSS("background-color", "rgb(52, 73, 94)");
  await unread.click();
  await page.mouse.move(0, 0);
  await expect(unread).toHaveAttribute("aria-checked", "true");
  await expect(all).toHaveAttribute("aria-checked", "false");
  await expect(unread).toHaveCSS("background-color", "rgb(52, 73, 94)");
  await expect(group.getByRole("radio", { name: "Przeczytane", exact: true })).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
});
