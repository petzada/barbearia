import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

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
  }

  return {
    server: { port: 3000 },
    resolve: { tsconfigPaths: true },
    plugins: [tanstackStart(), react(), tailwindcss()],
  }
})
