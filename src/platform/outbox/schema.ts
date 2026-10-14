import { sql } from 'drizzle-orm'
import { check, index, integer, jsonb, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core'
import { barbeariaIdColumn, createdAtColumn, instant } from '../db/columns'

export const OUTBOX_STATES = ['pendente', 'processado', 'falhou'] as const
export type OutboxState = (typeof OUTBOX_STATES)[number]

// PRD §7.5: o evento nasce na MESMA transação do dado. O `id` é o id do evento de domínio, então
// publicar duas vezes o mesmo evento não duplica linha (`on conflict do nothing`).
export const outbox = pgTable(
  'outbox',
  {
    id: uuid('id').primaryKey(),
    barbeariaId: barbeariaIdColumn(),
    tipo: text('tipo').notNull(),
    versao: integer('versao').notNull(),
    agregadoId: text('agregado_id').notNull(),
    revisaoAgregado: integer('revisao_agregado').notNull(),
    ocorridoEm: instant('ocorrido_em').notNull(),
    correlationId: text('correlation_id').notNull(),
    payload: jsonb('payload').notNull(),
    estado: text('estado').notNull().default('pendente'),
    tentativas: integer('tentativas').notNull().default(0),
    proximaTentativaEm: instant('proxima_tentativa_em').notNull().defaultNow(),
    ultimoErro: text('ultimo_erro'),
    criadoEm: createdAtColumn(),
    processadoEm: instant('processado_em'),
  },
  (tabela) => [
    index('outbox_pendentes_idx')
      .on(tabela.proximaTentativaEm)
      .where(sql`${tabela.estado} = 'pendente'`),
    index('outbox_agregado_idx').on(tabela.barbeariaId, tabela.agregadoId),
    check('outbox_estado_valido', sql`${tabela.estado} in ('pendente', 'processado', 'falhou')`),
  ],
)

// Idempotência por (handler, evento): a linha nasce na transação do próprio handler, então entrega
// e efeito do handler no banco são confirmados (ou desfeitos) juntos.
export const outboxEntregas = pgTable(
  'outbox_entregas',
  {
    handler: text('handler').notNull(),
    eventoId: uuid('evento_id')
      .notNull()
      .references(() => outbox.id),
    barbeariaId: barbeariaIdColumn(),
    entregueEm: instant('entregue_em').notNull(),
  },
  (tabela) => [primaryKey({ columns: [tabela.handler, tabela.eventoId] })],
)

export type LinhaOutbox = typeof outbox.$inferSelect
