import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// Regras de arquitetura do PRD §7.2 e §7.9 (fixadas em T01).
const importsProibidosNoDominio = [
  { group: ['**/infra', '**/infra/**'], message: 'domain não importa infra (PRD §7.2).' },
  {
    group: ['~/integrations', '~/integrations/**', '**/integrations/**'],
    message: 'domain não importa integrations (PRD §7.2).',
  },
  {
    group: ['~/ui', '~/ui/**', '**/ui', '**/ui/**', '~/routes/**'],
    message: 'domain não importa UI nem rotas (PRD §7.2).',
  },
  {
    group: ['~/platform/db', '~/platform/db/**'],
    message: 'domain não importa o acesso a banco (PRD §7.2).',
  },
]
const sdksProibidosNoDominio = [
  { name: 'pg', message: 'domain é puro: sem SDK/driver.' },
  { name: 'pino', message: 'domain é puro: sem SDK/driver.' },
  { name: 'react', message: 'domain é puro: sem UI.' },
  { name: 'react-dom', message: 'domain é puro: sem UI.' },
]

export default tseslint.config(
  {
    ignores: [
      'node_modules',
      '.output',
      '.tanstack',
      'dist',
      'drizzle',
      'playwright-report',
      'test-results',
      'src/routeTree.gen.ts',
      '.maestri',
      'docs',
      'reports',
      'research_notes',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // PRD §7.9: usar o logger (src/platform/logging), nunca console.
      'no-console': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      // PRD §7.2: módulos só se falam por index.ts ou eventos; nunca importam infra de outro módulo
      // (dentro do próprio módulo, usar import relativo).
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['~/modules/*/infra', '~/modules/*/infra/**'],
              message:
                'Não importe infra de módulo por alias: use a API pública (modules/<m>/index.ts) ou eventos.',
            },
          ],
        },
      ],
    },
  },
  {
    // PRD §7.9: sem `any` explícito e dependências puras no domínio.
    files: ['src/modules/**/domain/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-imports': [
        'error',
        { paths: sdksProibidosNoDominio, patterns: importsProibidosNoDominio },
      ],
    },
  },
  {
    // Fora do domínio, `any` explícito também é erro nas fronteiras; mantemos a regra do recommended (error).
    files: ['scripts/**/*.{ts,mjs}'],
    rules: { 'no-console': 'off' },
  },
)
