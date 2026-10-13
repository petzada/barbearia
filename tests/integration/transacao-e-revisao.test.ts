import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  assertRevision,
  isRetryableTransactionError,
  requireUpdatedRow,
  sqlStateOf,
  withTransaction,
} from '../../src/platform/db'
import { AppError } from '../../src/platform/errors'
import { abrirBancoDeTeste, type BancoDeTeste } from './helpers/banco'

let banco: BancoDeTeste

beforeAll(async () => {
  banco = await abrirBancoDeTeste()
})
afterAll(async () => {
  await banco.encerrar()
})

/** Erro com SQLSTATE como o do driver `pg`. */
function erroPg(code: string): Error {
  return Object.assign(new Error(`erro ${code}`), { code })
}

describe('withTransaction', () => {
  it('confirma ao final e devolve o valor', async () => {
    const valor = await withTransaction(banco.contexto(), async (tx) => {
      const { rows } = await tx.execute<{ n: number }>(sql`select 41 + 1 as n`)
      return rows[0]?.n
    })
    expect(valor).toBe(42)
  })

  it('repete em deadlock/serialização, de forma limitada, e depois entrega o sucesso', async () => {
    let tentativas = 0
    const resultado = await withTransaction(banco.contexto(), () => {
      tentativas += 1
      if (tentativas < 3) return Promise.reject(erroPg('40001'))
      return Promise.resolve('ok')
    })
    expect(resultado).toBe('ok')
    expect(tentativas).toBe(3)
  })

  it('desiste depois do máximo de tentativas e relança o erro original', async () => {
    let tentativas = 0
    await expect(
      withTransaction(
        banco.contexto(),
        () => {
          tentativas += 1
          return Promise.reject(erroPg('40P01'))
        },
        { maxAttempts: 2 },
      ),
    ).rejects.toMatchObject({ code: '40P01' })
    expect(tentativas).toBe(2)
  })

  it('não repete erro comum, de negócio ou de violação de constraint', async () => {
    let tentativas = 0
    await expect(
      withTransaction(banco.contexto(), () => {
        tentativas += 1
        return Promise.reject(erroPg('23505'))
      }),
    ).rejects.toMatchObject({ code: '23505' })
    expect(tentativas).toBe(1)
    await expect(
      withTransaction(banco.contexto(), () => {
        tentativas += 1
        return Promise.reject(new Error('regra'))
      }),
    ).rejects.toThrow('regra')
    expect(tentativas).toBe(2)
  })

  it('reconhece o SQLSTATE mesmo embrulhado em `cause` (como o Drizzle faz)', () => {
    const embrulhado = new Error('Failed query', { cause: erroPg('40001') })
    expect(sqlStateOf(embrulhado)).toBe('40001')
    expect(isRetryableTransactionError(embrulhado)).toBe(true)
    expect(isRetryableTransactionError(new Error('x'))).toBe(false)
  })
})

describe('concorrência otimista (expectedRevision)', () => {
  const codigoDe = (fn: () => unknown): string | undefined => {
    try {
      fn()
    } catch (erro) {
      return erro instanceof AppError ? erro.code : 'outro'
    }
    return undefined
  }

  it('revisão diferente → CONCURRENCY.REVISION_CONFLICT; igual ou ausente passa', () => {
    expect(codigoDe(() => assertRevision(3, 4))).toBe('CONCURRENCY.REVISION_CONFLICT')
    expect(codigoDe(() => assertRevision(4, 4))).toBeUndefined()
    expect(codigoDe(() => assertRevision(undefined, 4))).toBeUndefined()
  })

  it('UPDATE condicionado que não altera nenhuma linha vira conflito', () => {
    expect(codigoDe(() => requireUpdatedRow([]))).toBe('CONCURRENCY.REVISION_CONFLICT')
    expect(requireUpdatedRow([{ revisao: 5 }])).toEqual({ revisao: 5 })
  })
})
