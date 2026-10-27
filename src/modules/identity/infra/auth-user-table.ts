import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/**
 * Visão do Better Auth sobre `usuarios`: só as colunas que ele conhece. O Better Auth nunca cria usuário aqui
 * (o Google tem `disableSignUp`; a conta nasce em `completeFirstAccess`), e a tabela real tem colunas obrigatórias
 * dele desconhecidas (`barbearia_id`, `estado`…), que o validador de schema dele recusaria. Fica FORA do índice de
 * schemas do drizzle-kit: não vira migração, é só uma segunda "lente" sobre a mesma tabela.
 */
export const authUsers = pgTable('usuarios', {
  id: uuid('id').primaryKey(),
  nome: text('nome').notNull(),
  email: text('email_interno').notNull(),
  emailVerificado: boolean('email_verificado').notNull().default(false),
  imagem: text('imagem'),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
})
