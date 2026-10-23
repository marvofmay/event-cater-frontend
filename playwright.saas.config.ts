import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
    testDir: './tests/saas', workers: 1, timeout: 120000, reporter: 'list',
    outputDir: 'test-results/saas',
    use: {actionTimeout:15000, navigationTimeout:30000, baseURL: process.env.SAAS_TEST_URL || 'http://localhost:3000', trace:'off', screenshot:'only-on-failure', launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']}},
    projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}],
});
