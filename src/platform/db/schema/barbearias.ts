import { sql } from 'drizzle-orm'
import { check, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { newId } from '../../ids'

// D0019: um código, um deploy por barbearia. A linha do deploy é criada pelo seed a partir de BARBEARIA_SLUG;
// `barbearia_id` das demais tabelas aponta para ela. Marca e parâmetros ficam em T08 (configuração versionada).
export const barbearias = pgTable(
  'barbearias',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => newId()),
    slug: text('slug').notNull(),
    nome: text('nome').notNull(),
    // D0080: prazos, ciclos e lembretes usam o fuso da barbearia.
    fuso: text('fuso').notNull().default('America/Sao_Paulo'),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabela) => [
    uniqueIndex('barbearias_slug_uidx').on(tabela.slug),
    check('barbearias_slug_formato', sql`${tabela.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
  ],
)

export type Barbearia = typeof barbearias.$inferSelect
