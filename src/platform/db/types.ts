import type { criarDb } from './client'

export type Db = ReturnType<typeof criarDb>
/** Transação do Drizzle. Toda escrita de negócio acontece dentro de uma (PRD §7.5). */
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]
/** Tanto o banco quanto uma transação: serve para leituras e para quem aceita os dois. */
export type Executor = Db | Tx
