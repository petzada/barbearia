import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { exigirBancoDeTesteE2E } from './tests/e2e/helpers/banco-e2e'

export default defineConfig(({ command, mode }) => {
  // O build SSR em vários ambientes resolvia o plugin do React em modo dev (jsxDEV no servidor,
  // 500 em produção). Fixar NODE_ENV antes dos plugins garante o runtime JSX de produção.
  if (command === 'build') process.env['NODE_ENV'] = 'production'

  // Dev local: o servidor SSR lê process.env, mas o Vite só expõe .env* ao cliente (VITE_*).
  // Carrega .env.local para o processo do servidor sem sobrescrever o que já veio do ambiente.
  if (command === 'serve') {
    for (const [chave, valor] of Object.entries(loadEnv(mode, process.cwd(), ''))) {
      process.env[chave] ??= valor
    }
    if (process.env['E2E_FAKE_SESSION'] === '1') {
      const testUrl = process.env['DATABASE_URL_TEST']
      exigirBancoDeTesteE2E(testUrl)
      process.env['DATABASE_URL'] = testUrl
    }
  }

  return {
    server: { port: 3000 },
    resolve: { tsconfigPaths: true },
    define: {
      'import.meta.env.E2E_FAKE_SESSION': JSON.stringify(
        command === 'serve' && process.env['E2E_FAKE_SESSION'] === '1',
      ),
    },
    plugins: [tanstackStart(), react(), tailwindcss()],
  }
})
