import { bigint, date, integer, smallint, timestamp, uuid } from 'drizzle-orm/pg-core'
import { newId } from '../ids'
import { barbearias } from './schema/barbearias'

// Colunas padrão das tabelas de negócio (PRD §6.1). Use estes helpers em todo `modules/<m>/schema.ts`
// para que convenções (UUID v7, `barbearia_id`, revisão, dinheiro em centavos) não dependam de memória.
//
//   export const reservas = pgTable('reservas', {
//     ...mutableColumns(),                       // id, barbearia_id, criado_em, atualizado_em, revisao
//     inicio: instant('inicio').notNull(),
//     valorCentavos: centavos('valor_centavos').notNull(),
//   }, (t) => [unique('reservas_barbearia_id_id').on(t.barbeariaId, t.id)])  // alvo de FK composta

export function idColumn() {
  return uuid('id')
    .primaryKey()
    .$defaultFn(() => newId())
}

/** `barbearia_id` obrigatório, vindo da configuração do deploy (D0019); sempre o primeiro campo dos índices. */
export function barbeariaIdColumn() {
  return uuid('barbearia_id')
    .notNull()
    .references(() => barbearias.id)
}

export function createdAtColumn() {
  return timestamp('criado_em', { withTimezone: true }).notNull().defaultNow()
}

/** Concorrência otimista (PRD §6.1, §7.5): `expectedRevision` é comparado com esta coluna. */
export function revisionColumn() {
  return integer('revisao').notNull().default(1)
}

/** Agregado imutável ou histórico append-only: id, barbearia e criação. */
export function baseColumns() {
  return {
    id: idColumn(),
    barbeariaId: barbeariaIdColumn(),
    criadoEm: createdAtColumn(),
  }
}

/** Agregado mutável: base + `atualizado_em` + `revisao`. */
export function mutableColumns() {
  return {
    ...baseColumns(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
    revisao: revisionColumn(),
  }
}

/** Dinheiro: centavos inteiros em `bigint`, moeda BRL implícita. Lido como `number` seguro (ver `Money`). */
export function centavos(name: string) {
  return bigint(name, { mode: 'number' })
}

/** Percentual em pontos-base (10000 = 100%). */
export function basisPoints(name: string) {
  return integer(name)
}

/** Instante em `timestamptz` (UTC). */
export function instant(name: string) {
  return timestamp(name, { withTimezone: true, mode: 'date' })
}

/** Data local (sem fuso), como texto `AAAA-MM-DD`: ver `LocalDate` em `~/platform/time`. */
export function localDateColumn(name: string) {
  return date(name, { mode: 'string' })
}

/** Dia-âncora do ciclo (1 a 31, D0080). Acrescente um `check` 1..31 na tabela que usar. */
export function anchorDayColumn(name = 'dia_ancora') {
  return smallint(name)
}
