import { sql } from 'drizzle-orm'
import type { Db as BossDb } from 'pg-boss'
import type { Executor } from '../db/types'

export type SqlPiece = { readonly text: string } | { readonly param: number }

/**
 * Separa um SQL com placeholders posicionais (`$1`, `$2`…) em pedaços de texto e referências a
 * parâmetros. Ignora `$n` dentro de literais `'…'`, identificadores `"…"`, comentários e blocos
 * `$tag$…$tag$`. O índice devolvido é zero-based.
 */
export function splitPlaceholders(texto: string): SqlPiece[] {
  const pedacos: SqlPiece[] = []
  let inicio = 0
  let i = 0
  const empurrar = (ate: number): void => {
    if (ate > inicio) pedacos.push({ text: texto.slice(inicio, ate) })
  }
  while (i < texto.length) {
    const c = texto.charAt(i)
    if (c === "'" || c === '"') {
      i = fimDeAspas(texto, i, c)
    } else if (c === '-' && texto.charAt(i + 1) === '-') {
      const quebra = texto.indexOf('\n', i)
      i = quebra === -1 ? texto.length : quebra + 1
    } else if (c === '/' && texto.charAt(i + 1) === '*') {
      const fim = texto.indexOf('*/', i + 2)
      i = fim === -1 ? texto.length : fim + 2
    } else if (c === '$') {
      const tag = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(texto.slice(i))
      const numero = /^\$(\d+)/.exec(texto.slice(i))
      if (tag) {
        const fim = texto.indexOf(tag[0], i + tag[0].length)
        i = fim === -1 ? texto.length : fim + tag[0].length
      } else if (numero) {
        empurrar(i)
        pedacos.push({ param: Number(numero[1]) - 1 })
        i += numero[0].length
        inicio = i
      } else {
        i += 1
      }
    } else {
      i += 1
    }
  }
  empurrar(texto.length)
  return pedacos
}

function fimDeAspas(texto: string, abre: number, aspa: string): number {
  let i = abre + 1
  while (i < texto.length) {
    if (texto.charAt(i) === aspa) {
      if (texto.charAt(i + 1) === aspa)
        i += 2 // aspa duplicada = aspa literal
      else return i + 1
    } else {
      i += 1
    }
  }
  return texto.length
}

export function buildDrizzleSql(texto: string, valores: readonly unknown[]) {
  const partes = splitPlaceholders(texto).map((pedaco) => {
    if ('text' in pedaco) return sql.raw(pedaco.text)
    if (pedaco.param >= valores.length) {
      throw new RangeError(
        `SQL referencia $${pedaco.param + 1}, mas só há ${valores.length} valores.`,
      )
    }
    return sql.param(valores[pedaco.param])
  })
  return sql.join(partes, sql.raw(''))
}

/**
 * Faz um `Executor` do Drizzle (banco ou transação) falar a interface `Db` do pg-boss. É isto que permite
 * `boss.send(..., { db })` gravar o job NA transação do dado: commit confirma os dois, rollback desfaz os dois
 * (decisão "pg-boss na transação × outbox": ver `src/platform/jobs/README.md`).
 */
export function drizzleExecutorAsBossDb(executor: Executor): BossDb {
  return {
    async executeSql(texto: string, valores: unknown[] = []) {
      const resultado = await executor.execute(buildDrizzleSql(texto, valores))
      return { rows: resultado.rows }
    },
  }
}
