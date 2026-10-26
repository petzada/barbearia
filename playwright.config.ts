import { defineConfig, devices } from "@playwright/test";

/**
 * E2E contra `next dev` com um D1 local descartável (.wrangler/e2e), recriado
 * a cada execução. Requer .dev.vars (`npm run setup`) com AUTH_DEV_OTP=123456
 * e ADMIN_PHONE_NUMBERS (o primeiro número é o admin do teste).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:3000",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    ...devices["iPhone 13"],
    defaultBrowserType: "chromium",
  },
  webServer: {
    command: "npm run e2e:db && CF_PERSIST_DIR=.wrangler/e2e/v3 npx next dev -p 3000",
    url: "http://localhost:3000",
    // Nunca reaproveita um servidor existente: ele usaria outro banco.
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
