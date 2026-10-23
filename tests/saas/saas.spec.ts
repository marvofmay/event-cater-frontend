import {test,expect} from '@playwright/test';
const email=process.env.SAAS_TEST_EMAIL;
const password=process.env.SAAS_TEST_PASSWORD;
test.skip(!email || !password,'Provide separate development SaaS administrator credentials.');

test('SaaS administrator creates a company, activates it, suspends access and preserves its event',async({page,context})=>{
    const slug='e2e-'+Date.now().toString(36);
    let tenantUuid=''; let saasToken='';
    await page.goto('/saas');
    await page.getByLabel(/^E-mail/).fill(email!);
    await page.getByLabel(/^Hasło/).fill(password!);
    await page.getByRole('button',{name:'Zaloguj do SaaS'}).click();
    await expect(page.getByRole('button',{name:'Dodaj klienta'})).toBeVisible();
    saasToken=await page.evaluate(()=>sessionStorage.getItem('saas_token')||'');
    try {
        await page.getByRole('button',{name:'Dodaj klienta'}).click();
        let dialog=page.getByRole('dialog');
        await dialog.getByLabel('Nazwa firmy').fill('Test SaaS '+slug);
        await dialog.getByLabel(/^Kod firmy/).fill(slug);
        await dialog.getByLabel('E-mail administratora firmy').fill('owner@example.test');
        await dialog.getByLabel('Początkowe hasło administratora').fill(password!);
        const created=page.waitForResponse(r=>r.url().endsWith('/api/saas/tenants')&&r.request().method()==='POST');
        await dialog.getByRole('button',{name:'Utwórz klienta'}).click();
        const tenant=await (await created).json(); tenantUuid=tenant.uuid;
        expect(tenant.provisioning).toBe('ready');
        await expect(dialog).toBeHidden();
        const row=page.getByRole('row').filter({hasText:'Test SaaS '+slug});
        await expect(row).toContainText('Nieaktywny');
        async function status(label:string,reason:string) {
            await row.getByRole('button',{name:'Zarządzaj'}).click(); dialog=page.getByRole('dialog');
            await dialog.getByRole('combobox',{name:/^Status/}).click();
            await page.getByRole('option',{name:label,exact:true}).click();
            await dialog.getByLabel('Uzasadnienie zmiany').fill(reason);
            await dialog.getByRole('button',{name:'Zapisz status'}).click();
            await expect(dialog).toContainText(reason);
            await dialog.getByRole('button',{name:'Zamknij'}).click();
            await expect(row).toContainText(label);
        }
        await status('Aktywny','Uruchomienie klienta testowego');
        const customer=await context.newPage(); await customer.goto('/login');
        await customer.getByLabel(/^Kod firmy/).fill(slug);
        await customer.locator('#email').fill('owner@example.test');
        await customer.locator('#password').fill(password!);
        await customer.locator('button[type="submit"]').click();
        await expect(customer).toHaveURL('/');
        const jwt=await customer.evaluate(()=>localStorage.getItem('auth_token')||'');
        expect(jwt).toBeTruthy();
        // No explicit X-Tenant here: verifies the browser cookie and Next proxy route all existing API clients.
        const createdEvent=await customer.request.post('/api/events',{headers:{Authorization:'Bearer '+jwt},data:{title:'Poufne wydarzenie '+slug,date:'2026-12-31'}});
        expect(createdEvent.status()).toBe(201); const event=await createdEvent.json();
        await customer.goto('/catering/events'); await expect(customer.getByText('Poufne wydarzenie '+slug,{exact:true})).toBeVisible();
        await status('Zawieszony','Test natychmiastowego zawieszenia');
        const denied=await customer.request.get('/api/events/'+event.uuid,{headers:{Authorization:'Bearer '+jwt}}); expect(denied.status()).toBe(403);
        await status('Aktywny','Przywrócenie po teście');
        const stale=await customer.request.get('/api/events/'+event.uuid,{headers:{Authorization:'Bearer '+jwt}}); expect(stale.status()).toBe(401);
        const logged=await customer.request.post('/api/login',{data:{email:'owner@example.test',password}}); expect(logged.ok()).toBeTruthy();
        const fresh=await logged.json();
        const preserved=await customer.request.get('/api/events/'+event.uuid,{headers:{Authorization:'Bearer '+fresh.token}}); expect(preserved.ok()).toBeTruthy();
        await customer.close();
        await status('Usunięty','Zakończenie testu przeglądarkowego');
        await page.getByRole('button',{name:'Wyloguj z SaaS'}).click();
        await expect(page.getByRole('button',{name:'Zaloguj do SaaS'})).toBeVisible();
        expect((await page.request.get('/api/saas/tenants',{headers:{Authorization:'Bearer '+saasToken}})).status()).toBe(403);
    } finally {
        if(tenantUuid) {
            const auth=await page.request.post('/api/saas/login',{data:{email,password}});
            if(auth.ok()) {
                const {token}=await auth.json(); const headers={Authorization:'Bearer '+token};
                const current=await page.request.get('/api/saas/tenants/'+tenantUuid,{headers});
                if(current.ok()) {const tenant=await current.json();if(tenant.status!=='deleted') await page.request.patch('/api/saas/tenants/'+tenantUuid+'/status',{headers,data:{status:'deleted',version:Number(tenant.version),reason:'Sprzątanie testu przeglądarkowego'}});}
                await page.request.post('/api/saas/logout',{headers});
            }
        }
    }
});
