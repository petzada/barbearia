import { check, jsonb, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { barbeariaIdColumn, createdAtColumn, idColumn } from '../db/columns'

// PRD §6.2: chave única por (barbearia, ator, operação, chave). A linha só existe depois do commit da
// operação (é gravada na mesma transação do efeito), então "chave encontrada" sempre significa "já executada".
export const chavesIdempotencia = pgTable(
  'chaves_idempotencia',
  {
    id: idColumn(),
    barbeariaId: barbeariaIdColumn(),
    /** Id do ator, ou `anonimo` / `sistema` quando não há. */
    atorId: text('ator_id').notNull(),
    operacao: text('operacao').notNull(),
    chave: text('chave').notNull(),
    hashPayload: text('hash_payload').notNull(),
    /** Resultado JSON devolvido na primeira execução; repetido nas retentativas. */
    resultado: jsonb('resultado'),
    criadoEm: createdAtColumn(),
  },
  (tabela) => [
    uniqueIndex('chaves_idempotencia_escopo_uidx').on(
      tabela.barbeariaId,
      tabela.atorId,
      tabela.operacao,
      tabela.chave,
    ),
    check('chaves_idempotencia_hash_sha256', sql`${tabela.hashPayload} ~ '^[0-9a-f]{64}$'`),
  ],
)
