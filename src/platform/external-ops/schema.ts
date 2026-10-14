import { sql } from 'drizzle-orm'
import { check, index, integer, jsonb, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core'
import { instant, mutableColumns } from '../db/columns'

export const EXTERNAL_OPERATION_STATES = [
  'pendente',
  'em_andamento',
  'confirmada',
  'incerta',
  'falhou',
] as const
export type ExternalOperationState = (typeof EXTERNAL_OPERATION_STATES)[number]

// PRD §7.5: chamada a provedor é uma INTENÇÃO persistida (commit) antes de sair da aplicação.
// `incerta` = a chamada pode ter sido aplicada pelo provedor; nunca se repete sem reconciliar.
export const operacoesExternas = pgTable(
  'operacoes_externas',
  {
    ...mutableColumns(),
    tipo: text('tipo').notNull(),
    /** Também enviada ao provedor como chave de idempotência da chamada. */
    chaveIdempotente: text('chave_idempotente').notNull(),
    alvo: text('alvo').notNull(),
    estado: text('estado').notNull().default('pendente'),
    tentativas: integer('tentativas').notNull().default(0),
    /** Tentativas de reconciliação já feitas (só conta em `incerta`). */
    reconciliacoes: integer('reconciliacoes').notNull().default(0),
    ultimoErro: text('ultimo_erro'),
    /** Entrada da chamada, guardada para repetir/reconciliar no worker. Nunca segredo nem cartão. */
    entrada: jsonb('entrada'),
    resultado: jsonb('resultado'),
    iniciadaEm: instant('iniciada_em'),
  },
  (tabela) => [
    uniqueIndex('operacoes_externas_chave_uidx').on(
      tabela.barbeariaId,
      tabela.tipo,
      tabela.chaveIdempotente,
    ),
    index('operacoes_externas_estado_idx').on(tabela.barbeariaId, tabela.estado),
    check(
      'operacoes_externas_estado_valido',
      sql`${tabela.estado} in ('pendente', 'em_andamento', 'confirmada', 'incerta', 'falhou')`,
    ),
  ],
)

export type LinhaOperacaoExterna = typeof operacoesExternas.$inferSelect
