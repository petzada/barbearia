import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => {
  // O build SSR em vários ambientes resolvia o plugin do React em modo dev (jsxDEV no servidor,
  // 500 em produção). Fixar NODE_ENV antes dos plugins garante o runtime JSX de produção.
  if (command === 'build') process.env['NODE_ENV'] = 'production'

  return {
    server: { port: 3000 },
    resolve: { tsconfigPaths: true },
    plugins: [tanstackStart(), react(), tailwindcss()],
  }
})
