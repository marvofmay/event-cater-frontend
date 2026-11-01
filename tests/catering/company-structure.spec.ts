import { expect, test } from "@playwright/test";

const companyUuid = "00000000-0000-4000-8000-000000000001";
const departmentUuid = "00000000-0000-4000-8000-000000000002";
const employeeUuid = "00000000-0000-4000-8000-000000000003";

test("company dashboard tile always opens the company tree", async ({ page }) => {
    await authenticate(page);
    await page.route("**/api/**", route => route.fulfill({ json: { data: { items: [{ uuid: companyUuid, type: "company", name: "Mapa Smaków", active: true }], total: 1, page: 1, hasMore: false } } }));
    await page.goto("/");
    await expect(page.locator('a[href="/module/company"]')).toHaveText('Firma');
    await page.getByRole('button').filter({ has: page.getByTestId('Person2Icon') }).click();
    await expect(page.getByRole('menuitem', { name: 'zmień hasło', exact: true })).toHaveText('zmień hasło');
    await page.keyboard.press('Escape');
    await page.locator('a[href="/module/company"]').click();
    await expect(page).toHaveURL(/\/module\/company$/);
    await expect(page.getByRole("heading", { name: "Struktura firmy" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Rozwiń firma: Mapa Smaków" })).toBeVisible();
});

test("contact preview is lazy and available without employee management permission", async ({ page }) => {
    await authenticate(page);
    let previews = 0;
    await page.route("**/api/**", route => {
        const path = new URL(route.request().url()).pathname;
        if (path === `/api/company-structure/employees/${employeeUuid}`) {
            previews++;
            return route.fulfill({ json: { data: { uuid: employeeUuid, firstName: "Anna", lastName: "Kowalska", phones: ["+48123456789"], emails: ["anna@example.test"] } } });
        }
        if (path === "/api/company-structure") return route.fulfill({ json: { data: { items: [{ uuid: employeeUuid, type: "employee", name: "Anna Kowalska", active: true }], total: 1, page: 1, hasMore: false } } });
        return route.fulfill({ json: {} });
    });
    await page.goto("/module/company");
    const preview = page.getByRole("button", { name: "Podgląd pracownika: Anna Kowalska" });
    await expect(preview).toBeVisible();
    expect(previews).toBe(0);
    await preview.click();
    const dialog = page.getByRole("dialog", { name: "Dane kontaktowe pracownika" });
    await expect(dialog).toContainText("Anna");
    await expect(dialog).toContainText("Kowalska");
    await expect(dialog.getByRole("link", { name: "+48123456789" })).toHaveAttribute("href", "tel:+48123456789");
    await expect(dialog.getByRole("link", { name: "anna@example.test" })).toHaveAttribute("href", "mailto:anna%40example.test");
    expect(previews).toBeGreaterThan(0);
    await dialog.getByRole("button", { name: "Zamknij" }).click();
    await expect(dialog).toBeHidden();
});

test("moving an employee refreshes both departments in an already open tree", async ({ page, context }) => {
    await authenticate(page);
    const hygieneUuid = "00000000-0000-4000-8000-000000000004";
    let moved = false;
    const employee = { uuid: employeeUuid, type: "employee", name: "Diana", active: true };
    await page.route("**/api/**", route => {
        const url = new URL(route.request().url());
        if (url.pathname !== "/api/company-structure") return route.fulfill({ json: {} });
        const type = url.searchParams.get("parentType");
        const parent = url.searchParams.get("parentUuid");
        const items = type === "root"
            ? [{ uuid: companyUuid, type: "company", name: "Mapa Smaków", active: true }]
            : type === "company"
                ? [{ uuid: departmentUuid, type: "department", name: "Obsługa", active: true }, { uuid: hygieneUuid, type: "department", name: "Czystość i higiena", active: true }]
                : parent === (moved ? hygieneUuid : departmentUuid) ? [employee] : [];
        return route.fulfill({ json: { data: { items, total: items.length, page: 1, hasMore: false } } });
    });
    await page.goto("/module/company");
    await page.getByRole("button", { name: "Rozwiń firma: Mapa Smaków" }).click();
    await page.getByRole("button", { name: "Rozwiń oddział: Obsługa" }).click();
    await page.getByRole("button", { name: "Rozwiń oddział: Czystość i higiena" }).click();
    const service = page.getByRole("listitem").filter({ has: page.getByRole("button", { name: "Zwiń oddział: Obsługa", exact: true }) }).last();
    const hygiene = page.getByRole("listitem").filter({ has: page.getByRole("button", { name: "Zwiń oddział: Czystość i higiena", exact: true }) }).last();
    await expect(service.getByText("Diana", { exact: true })).toBeVisible();
    await expect(hygiene.getByText("Diana", { exact: true })).toHaveCount(0);
    moved = true;
    const editor = await context.newPage();
    await editor.goto("/robots.txt");
    await editor.evaluate(() => localStorage.setItem("company-structure-changed", crypto.randomUUID()));
    await expect(hygiene.getByText("Diana", { exact: true })).toBeVisible();
    await expect(service.getByText("Diana", { exact: true })).toHaveCount(0);
    await editor.close();
});

async function authenticate(page: import("@playwright/test").Page) {
    const payload = {
        exp: Math.floor(Date.now() / 1000) + 3600, tenantSlug: "default", tenantName: "Firma testowa", modules: ["company"],
        accesses: ['company_structure'],
        permissions: ['company_structure.view'],
    };
    const token = [Buffer.from('{"alg":"none"}').toString("base64url"), Buffer.from(JSON.stringify(payload)).toString("base64url"), "test"].join(".");
    await page.addInitScript(value => localStorage.setItem("auth_token", value), token);
}

test("loads only expanded branches, reuses cache, searches and loads additional pages", async ({ page }) => {
    await authenticate(page);
    const calls: URL[] = [];
    let failDepartment = true;
    await page.route("**/api/**", route => {
        const url = new URL(route.request().url());
        if (url.pathname !== "/api/company-structure") return route.fulfill({ json: {} });
        calls.push(url);
        const type = url.searchParams.get("parentType");
        const currentPage = Number(url.searchParams.get("page"));
        const phrase = url.searchParams.get("phrase");
        if (type === "root") return route.fulfill({ json: { data: { items: [{ uuid: companyUuid, type: "company", name: "Mapa Smaków", subtitle: null, active: true }], total: 1, page: 1, hasMore: false } } });
        if (type === "company") return route.fulfill({ json: { data: { items: [{ uuid: departmentUuid, type: "department", name: "Kuchnia", subtitle: "KUCH", active: true }], total: 1, page: 1, hasMore: false } } });
        if (failDepartment) return route.fulfill({ status: 500, json: {} });
        const items = phrase ? [] : [{ uuid: currentPage === 1 ? employeeUuid : "00000000-0000-4000-8000-000000000004", type: "employee", name: currentPage === 1 ? "Anna Kowalska" : "Jan Nowak", subtitle: "Kucharz", active: currentPage === 1 }];
        return route.fulfill({ json: { data: { items, total: phrase ? 0 : 31, page: currentPage, hasMore: !phrase && currentPage === 1 } } });
    });
    await page.goto("/module/company");
    await expect(page.getByRole("heading", { name: "Struktura firmy" })).toBeVisible();
    const company = page.getByRole("button", { name: "Rozwiń firma: Mapa Smaków" });
    await expect(company).toBeVisible();
    expect(new Set(calls.map(url => url.searchParams.get("parentType")))).toEqual(new Set(["root"]));
    const initialRootCalls = calls.length;
    await company.focus();
    await page.keyboard.press("Enter");
    const department = page.getByRole("button", { name: "Rozwiń oddział: Kuchnia" });
    await expect(department).toBeVisible();
    expect(calls.filter(url => url.searchParams.get("parentType") === "department")).toHaveLength(0);
    await department.click();
    await expect(page.getByRole("alert").filter({ hasText: "Nie udało się pobrać" })).toBeVisible();
    failDepartment = false;
    await page.getByRole("button", { name: "Ponów" }).click();
    await expect(page.getByText("Anna Kowalska", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Pokaż kolejne 30" }).click();
    await expect(page.getByText("Jan Nowak", { exact: true })).toBeVisible();
    await expect(page.getByText("Nieaktywny", { exact: true })).toBeVisible();
    const beforeCollapse = calls.length;
    await page.getByRole("button", { name: "Zwiń firma: Mapa Smaków" }).click();
    await expect(page.getByText("Anna Kowalska", { exact: true })).not.toBeVisible();
    await company.click();
    await expect(page.getByText("Anna Kowalska", { exact: true })).toBeVisible();
    expect(calls).toHaveLength(beforeCollapse);
    await expect(page.getByRole("textbox", { name: "Szukaj w tej gałęzi", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Zwiń wszystko" }).click();
    await expect(department).not.toBeVisible();
    await expect(company).toHaveAttribute("aria-expanded", "false");
    await page.getByRole("button", { name: "Odśwież strukturę" }).click();
    await expect.poll(() => calls.filter(url => url.searchParams.get("parentType") === "root").length).toBe(initialRootCalls + 1);
});

test("mobile structure view does not require management access and fits the viewport", async ({ page }) => {
    await authenticate(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/api/**", route => route.fulfill({ json: { data: { items: [], total: 0, page: 1, hasMore: false } } }));
    await page.goto("/module/company");
    await expect(page.getByText("Nie dodano jeszcze żadnej firmy.")).toBeVisible();
    const width = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.innerWidth }));
    expect(width.content).toBeLessThanOrEqual(width.viewport);
});

test("global search finds a person in unopened branches and reveals a result outside loaded pages", async ({ page }) => {
    await authenticate(page);
    const company = { uuid: companyUuid, type: "company", name: "Mapa Smaków", subtitle: null, active: true };
    const department = { uuid: departmentUuid, type: "department", name: "Obsługa", subtitle: null, active: true };
    const employee = { uuid: employeeUuid, type: "employee", name: "Diana Nowak", subtitle: "Koordynator wydarzenia", active: true };
    const searches: string[] = [];
    let pathRequests = 0;
    await page.route("**/api/**", route => {
        const url = new URL(route.request().url());
        if (url.pathname !== "/api/company-structure") return route.fulfill({ json: {} });
        const mode = url.searchParams.get("mode");
        if (mode === "path") {
            pathRequests++;
            return route.fulfill({ json: { data: { items: [company, department, employee] } } });
        }
        if (mode === "search") {
            const phrase = url.searchParams.get("phrase") ?? "";
            searches.push(phrase);
            const items = ["Diana", "123456789", "diana@example.test"].includes(phrase) ? [{ ...employee, companyName: "Mapa Smaków", departmentName: "Obsługa" }] : [];
            return route.fulfill({ json: { data: { items, total: items.length, page: 1, hasMore: false } } });
        }
        return route.fulfill({ json: { data: { items: [], total: 60, page: 1, hasMore: true } } });
    });
    await page.goto("/module/company");
    const search = page.getByRole("textbox", { name: "Szukaj w całej strukturze" });
    await expect(search).toHaveAttribute("placeholder", "Np. imię/nazwisko/dział/firma/telefon/email");
    await search.fill("D");
    await expect(page.getByRole("button", { name: "Pokaż w drzewie: Diana Nowak" })).not.toBeVisible();
    await search.fill("Diana");
    const result = page.getByRole("button", { name: "Pokaż w drzewie: Diana Nowak" });
    await expect(result).toBeVisible();
    await expect(result).toContainText("Mapa Smaków → Obsługa");
    expect(searches).not.toContain("D");
    await result.click();
    await expect(page.getByRole("button", { name: "Zwiń firma: Mapa Smaków" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Zwiń oddział: Obsługa" })).toBeVisible();
    await expect(page.getByRole("listitem", { name: "Znaleziony element: Diana Nowak" })).toBeVisible();
    expect(pathRequests).toBe(1);
    await page.getByRole("button", { name: "Wyczyść wyszukiwanie" }).click();
    await expect(search).toHaveValue("");
    await expect(page.getByRole("list", { name: "Wyniki wyszukiwania struktury" })).not.toBeVisible();
    await search.fill("Nieistniejący");
    await expect(page.getByText("Brak wyników w całej strukturze.")).toBeVisible();
    for (const phrase of ["123456789", "diana@example.test"]) {
        await search.fill(phrase);
        await expect(result).toBeVisible();
        expect(searches).toContain(phrase);
    }
});
