import { defineConfig } from 'vitest/config'

// Dois projetos separados (PRD §8.1): `unit` não toca rede; `integration` usa o Postgres do Railway (D0082).
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    // O logger de operações escreve em stdout; nos testes ele fica mudo (os testes de logging criam o seu).
    env: { LOG_LEVEL: 'silent' },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: [
            // .tsx: testes de componente (T05) pedem `// @vitest-environment jsdom` no próprio arquivo.
            'tests/unit/**/*.test.{ts,tsx}',
            'tests/security/**/*.test.ts',
            'tests/contract/**/*.test.ts',
            'src/**/*.test.{ts,tsx}',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/**/*.test.ts'],
          globalSetup: ['tests/integration/global-setup.ts'],
          setupFiles: ['tests/integration/setup.ts'],
          // Um arquivo por vez: todos compartilham o mesmo banco barbearia_test.
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
    ],
  },
})
