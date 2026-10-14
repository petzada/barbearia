import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'

if (process.env['E2E_FAKE_SESSION'] === '1') {
  config({ path: '.env.local', quiet: true })
  const testUrl = process.env['DATABASE_URL_TEST']
  const bancoEsperado = (() => {
    try {
      return !!testUrl && new URL(testUrl).pathname.replace(/^\//, '') === 'barbearia_t06_test'
    } catch {
      return false
    }
  })()
  if (!bancoEsperado) {
    throw new Error('E2E_FAKE_SESSION exige DATABASE_URL_TEST apontando para o banco T06.')
  }
  process.env['DATABASE_URL'] = testUrl
}

// A porta é configurável (E2E_PORT) para duas worktrees rodarem E2E ao mesmo tempo sem colidir.
const PORT = Number(process.env['E2E_PORT'] ?? 3100)

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  workers: 2,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  // Mobile é o viewport principal do cliente e da equipe; desktop é o do admin (PRD §4).
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: `pnpm exec vite dev --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
})
