import { config } from 'dotenv'
import { defineConfig, devices } from '@playwright/test'

config({ path: '.env.local', quiet: true })

// Porta própria (T04: 3104). Outras tasks usam 3100/3105; `E2E_PORT` troca sem editar o arquivo.
const PORT = Number(process.env['E2E_PORT'] ?? 3104)
const ARQUIVO_DE_MENSAGENS = '.dev/e2e-mensagens.jsonl'

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: [['list']],
  globalSetup: './tests/e2e/global-setup.ts',
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
    reuseExistingServer: false,
    timeout: 120_000,
    // O servidor do e2e usa SÓ o banco `_test` (D0082) e o provedor de mensagens falso, que grava os códigos num arquivo.
    env: {
      DATABASE_URL: process.env['DATABASE_URL_TEST'] ?? '',
      APP_URL: `http://localhost:${PORT}`,
      IDENTITY_DEV_OTP_FILE: ARQUIVO_DE_MENSAGENS,
      LOG_LEVEL: 'warn',
    },
  },
})
