import { index, jsonb, pgTable, text } from 'drizzle-orm/pg-core'
import { barbeariaIdColumn, idColumn, instant } from '../db/columns'

// PRD §6.2: auditoria append-only (um trigger na migração recusa UPDATE e DELETE). Guarda estado
// REDUZIDO antes/depois, nunca o registro inteiro nem dado pessoal.
export const auditoria = pgTable(
  'auditoria',
  {
    id: idColumn(),
    barbeariaId: barbeariaIdColumn(),
    ocorridaEm: instant('ocorrida_em').notNull(),
    /** `null` para ações do sistema (jobs). */
    atorId: text('ator_id'),
    atorPapeis: text('ator_papeis').array().notNull().default([]),
    acao: text('acao').notNull(),
    recursoTipo: text('recurso_tipo').notNull(),
    recursoId: text('recurso_id').notNull(),
    antes: jsonb('antes'),
    depois: jsonb('depois'),
    motivo: text('motivo'),
    correlationId: text('correlation_id').notNull(),
  },
  (tabela) => [
    index('auditoria_recurso_idx').on(
      tabela.barbeariaId,
      tabela.recursoTipo,
      tabela.recursoId,
      tabela.ocorridaEm,
    ),
    index('auditoria_ocorrida_idx').on(tabela.barbeariaId, tabela.ocorridaEm),
    index('auditoria_correlation_idx').on(tabela.barbeariaId, tabela.correlationId),
  ],
)

export type LinhaAuditoria = typeof auditoria.$inferSelect
