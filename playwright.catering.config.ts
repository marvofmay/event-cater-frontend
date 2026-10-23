import { defineConfig, devices } from "@playwright/test";

const port = process.env.CATERING_PORT || "3002";
export default defineConfig({
  testDir: "./tests/catering",
  fullyParallel: false,
  workers: 1,
  timeout: 120000,
  expect: { timeout: 15000 },
  reporter: "list",
  outputDir: "test-results/catering",
  use: {
    baseURL: `http://localhost:${port}`,
    actionTimeout: 15000,
    navigationTimeout: 30000,
    trace: "off",
    screenshot: "only-on-failure",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm start -- --port ${port} --hostname 0.0.0.0`,
    url: `http://localhost:${port}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      API_INTERNAL_URL: process.env.API_INTERNAL_URL || "http://localhost:81",
    },
  },
});
