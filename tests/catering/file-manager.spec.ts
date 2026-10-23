import { expect, test } from "@playwright/test";

test("creating a folder keeps it selected without resetting the file tree", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const token = [
    Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url"),
    Buffer.from(JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + 3600,
      modules: ["file_manager"], accesses: ["file_manager"], permissions: ["file_manager.*"],
      tenantSlug: "default",
    })).toString("base64url"),
    "test",
  ].join(".");
  await page.addInitScript((value) => localStorage.setItem("auth_token", value), token);
  await page.route("**/api/files**", (route) => route.fulfill({ status: 404, json: { message: "Not found" } }));
  await page.goto("/module/file_manager");
  await page.getByText("Dodaj", { exact: true }).click();
  await page.getByText("Dodaj folder", { exact: true }).click();
  await page.getByRole("textbox").last().fill("Sprzęt na wydarzenia");
  await page.getByRole("button", { name: "OK", exact: true }).click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Sprzęt na wydarzenia", { exact: true }).first()).toBeVisible();
  await expect.poll(() => errors).toEqual([]);
});
