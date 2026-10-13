import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: '.env.local' })

export default defineConfig({
  dialect: 'postgresql',
  // Cada módulo tem o seu schema.ts; o índice central só reexporta (PRD §11.4).
  schema: './src/platform/db/schema/index.ts',
  out: './drizzle',
  dbCredentials: { url: process.env['DATABASE_URL'] ?? '' },
})
