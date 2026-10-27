import { sql } from 'drizzle-orm'
import { check, index, integer, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core'
import { barbeariaIdColumn, idColumn, instant } from '~/platform/db/columns'

export const DELIVERY_STATES = ['pendente', 'enviado', 'falhou', 'confirmado'] as const
export type DeliveryState = (typeof DELIVERY_STATES)[number]

export const entregas = pgTable(
  'entregas',
  {
    id: idColumn(),
    barbeariaId: barbeariaIdColumn(),
    canal: text('canal').notNull(),
    instancia: text('instancia'),
    destinatarioMascarado: text('destinatario_mascarado').notNull(),
    telefoneHash: text('telefone_hash').notNull(),
    template: text('template'),
    chaveIdempotente: text('chave_idempotente').notNull(),
    hashPayload: text('hash_payload').notNull(),
    estado: text('estado').notNull().default('pendente'),
    tentativas: integer('tentativas').notNull().default(0),
    idExterno: text('id_externo'),
    ultimoErro: text('ultimo_erro'),
    criadoEm: instant('criado_em').notNull().defaultNow(),
    atualizadoEm: instant('atualizado_em').notNull().defaultNow(),
  },
  (tabela) => [
    uniqueIndex('entregas_chave_uidx').on(tabela.barbeariaId, tabela.chaveIdempotente),
    uniqueIndex('entregas_id_externo_uidx')
      .on(tabela.barbeariaId, tabela.instancia, tabela.idExterno)
      .where(sql`${tabela.idExterno} is not null`),
    index('entregas_estado_idx').on(tabela.barbeariaId, tabela.estado, tabela.criadoEm),
    check('entregas_canal_valido', sql`${tabela.canal} in ('otp', 'avisos')`),
    check(
      'entregas_estado_valido',
      sql`${tabela.estado} in ('pendente', 'enviado', 'falhou', 'confirmado')`,
    ),
    check('entregas_tentativas_nao_negativas', sql`${tabela.tentativas} >= 0`),
    check('entregas_hash_sha256', sql`${tabela.telefoneHash} ~ '^[0-9a-f]{64}$'`),
    check('entregas_payload_hash_sha256', sql`${tabela.hashPayload} ~ '^[0-9a-f]{64}$'`),
  ],
)

export type DeliveryRow = typeof entregas.$inferSelect
