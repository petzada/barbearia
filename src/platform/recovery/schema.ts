import { boolean, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core'
import { instant, mutableColumns } from '../db/columns'

// D0078: flag no banco, só alterada por operador (CLI `pnpm ops:recovery`). Ausência de linha = normal.
export const estadoRecuperacao = pgTable(
  'estado_recuperacao',
  {
    ...mutableColumns(),
    ativo: boolean('ativo').notNull().default(false),
    /** Instante do backup restaurado: a conciliação com os provedores parte daqui. */
    pontoRestaurado: instant('ponto_restaurado'),
    ativadoPor: text('ativado_por'),
    motivo: text('motivo'),
    ativadoEm: instant('ativado_em'),
  },
  (tabela) => [uniqueIndex('estado_recuperacao_barbearia_uidx').on(tabela.barbeariaId)],
)

export type LinhaEstadoRecuperacao = typeof estadoRecuperacao.$inferSelect
