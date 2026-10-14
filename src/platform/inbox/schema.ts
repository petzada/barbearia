import { sql } from 'drizzle-orm'
import { check, index, integer, jsonb, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core'
import { barbeariaIdColumn, createdAtColumn, idColumn, instant } from '../db/columns'

export const INBOX_STATES = ['recebido', 'processando', 'processado', 'falhou'] as const
export type InboxState = (typeof INBOX_STATES)[number]

// PRD §7.6: todo webhook verificado é persistido ANTES do ACK. O registro original nunca é apagado
// nem reescrito: reprocessar muda só o estado, exige motivo e fica na auditoria.
export const inboxProvedor = pgTable(
  'inbox_provedor',
  {
    id: idColumn(),
    barbeariaId: barbeariaIdColumn(),
    provedor: text('provedor').notNull(),
    /** Conta do provedor (RN05: id externo = provedor + conta + ambiente). */
    conta: text('conta').notNull(),
    ambiente: text('ambiente').notNull(),
    eventoExternoId: text('evento_externo_id').notNull(),
    hashCorpo: text('hash_corpo').notNull(),
    /** Só os cabeçalhos que o adapter declarou relevantes, já sem segredos. */
    cabecalhos: jsonb('cabecalhos').notNull().default({}),
    /** Corpo limitado (256 KB) e sem sequências que pareçam número de cartão. */
    corpo: text('corpo').notNull(),
    recebidoEm: instant('recebido_em').notNull(),
    estado: text('estado').notNull().default('recebido'),
    tentativas: integer('tentativas').notNull().default(0),
    ultimoErro: text('ultimo_erro'),
    processadoEm: instant('processado_em'),
    reprocessamentos: integer('reprocessamentos').notNull().default(0),
    criadoEm: createdAtColumn(),
  },
  (tabela) => [
    uniqueIndex('inbox_provedor_evento_uidx').on(
      tabela.barbeariaId,
      tabela.provedor,
      tabela.conta,
      tabela.ambiente,
      tabela.eventoExternoId,
    ),
    index('inbox_provedor_estado_idx').on(tabela.barbeariaId, tabela.estado, tabela.recebidoEm),
    check('inbox_provedor_hash_sha256', sql`${tabela.hashCorpo} ~ '^[0-9a-f]{64}$'`),
    check(
      'inbox_provedor_estado_valido',
      sql`${tabela.estado} in ('recebido', 'processando', 'processado', 'falhou')`,
    ),
  ],
)

export type LinhaInbox = typeof inboxProvedor.$inferSelect
