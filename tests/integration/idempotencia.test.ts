import { and, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AppError } from '../../src/platform/errors'
import { chavesIdempotencia, hashPayload, withIdempotency } from '../../src/platform/idempotency'
import { abrirBancoDeTeste, type BancoDeTeste } from './helpers/banco'

let banco: BancoDeTeste

beforeAll(async () => {
  banco = await abrirBancoDeTeste()
})
afterAll(async () => {
  await banco.encerrar()
})

const chaveNova = (): string => crypto.randomUUID()

async function codigoDoErro(promessa: Promise<unknown>): Promise<string | undefined> {
  try {
    await promessa
  } catch (erro) {
    return erro instanceof AppError ? erro.code : `outro:${String(erro)}`
  }
  return undefined
}

describe('withIdempotency (PRD §7.3)', () => {
  it('mesma chave + mesmo payload → mesmo resultado, e o efeito acontece uma única vez', async () => {
    const ctx = banco.contexto()
    const chave = chaveNova()
    const hash = hashPayload({ reservaId: 'r1' })
    let execucoes = 0
    const executar = () =>
      withIdempotency(ctx, 'teste.cancelar', chave, hash, () => {
        execucoes += 1
        return Promise.resolve({ cancelada: true, numero: execucoes })
      })

    const primeiro = await executar()
    const segundo = await executar()
    const terceiro = await executar()
    expect(primeiro).toEqual({ cancelada: true, numero: 1 })
    expect(segundo).toEqual(primeiro)
    expect(terceiro).toEqual(primeiro)
    expect(execucoes).toBe(1)
  })

  it('mesma chave + payload diferente → IDEMPOTENCY.KEY_REUSED e o efeito não executa', async () => {
    const ctx = banco.contexto()
    const chave = chaveNova()
    await withIdempotency(ctx, 'teste.cancelar', chave, hashPayload({ reservaId: 'r1' }), () =>
      Promise.resolve('feito'),
    )
    let executou = false
    const codigo = await codigoDoErro(
      withIdempotency(ctx, 'teste.cancelar', chave, hashPayload({ reservaId: 'r2' }), () => {
        executou = true
        return Promise.resolve('outro')
      }),
    )
    expect(codigo).toBe('IDEMPOTENCY.KEY_REUSED')
    expect(executou).toBe(false)
  })

  it('duas chamadas concorrentes com a mesma chave executam o efeito uma vez e devolvem o mesmo resultado', async () => {
    const ctx = banco.contexto()
    const chave = chaveNova()
    const hash = hashPayload({ n: 1 })
    let execucoes = 0
    let liberar!: () => void
    const portao = new Promise<void>((resolve) => (liberar = resolve))
    let entrou!: () => void
    const primeiraEntrou = new Promise<void>((resolve) => (entrou = resolve))

    const primeira = withIdempotency(ctx, 'teste.pagar', chave, hash, async () => {
      execucoes += 1
      entrou()
      await portao // segura a transação aberta até a segunda estar esperando no índice único
      return { protocolo: 'P-1' }
    })
    await primeiraEntrou
    const segunda = withIdempotency(ctx, 'teste.pagar', chave, hash, () => {
      execucoes += 1
      return Promise.resolve({ protocolo: 'P-2' })
    })

    // Sem sleep: espera até o Postgres mostrar a segunda sessão bloqueada em lock (limite de 10 s).
    const limite = Date.now() + 10_000
    for (;;) {
      const { rows } = await banco.pool.query<{ n: string }>(
        `select count(*) as n from pg_stat_activity
          where datname = current_database() and wait_event_type = 'Lock'`,
      )
      if (Number(rows[0]?.n) >= 1) break
      if (Date.now() > limite) throw new Error('a segunda chamada nunca bloqueou no índice único')
      await new Promise((resolve) => setImmediate(resolve))
    }
    liberar()

    const [a, b] = await Promise.all([primeira, segunda])
    expect(a).toEqual({ protocolo: 'P-1' })
    expect(b).toEqual({ protocolo: 'P-1' })
    expect(execucoes).toBe(1)
  })

  it('rajada de 8 chamadas simultâneas com a mesma chave: um efeito, um resultado', async () => {
    const ctx = banco.contexto()
    const chave = chaveNova()
    const hash = hashPayload({ rajada: true })
    let execucoes = 0
    const resultados = await Promise.all(
      Array.from({ length: 8 }, () =>
        withIdempotency(ctx, 'teste.rajada', chave, hash, async () => {
          execucoes += 1
          await new Promise((resolve) => setImmediate(resolve))
          return { vencedora: execucoes }
        }),
      ),
    )
    expect(execucoes).toBe(1)
    expect(new Set(resultados.map((r) => JSON.stringify(r))).size).toBe(1)
  })

  it('falha no efeito desfaz a chave: a retentativa executa de novo', async () => {
    const ctx = banco.contexto()
    const chave = chaveNova()
    const hash = hashPayload({ x: 1 })
    await expect(
      withIdempotency(ctx, 'teste.falha', chave, hash, () => Promise.reject(new Error('boom'))),
    ).rejects.toThrow('boom')
    const linhas = await banco.db
      .select()
      .from(chavesIdempotencia)
      .where(
        and(
          eq(chavesIdempotencia.barbeariaId, ctx.barbeariaId),
          eq(chavesIdempotencia.chave, chave),
        ),
      )
    expect(linhas).toHaveLength(0)
    expect(
      await withIdempotency(ctx, 'teste.falha', chave, hash, () => Promise.resolve('ok')),
    ).toBe('ok')
  })

  it('o escopo é (barbearia, ator, operação, chave): a mesma chave vale de novo para outro ator ou outra operação', async () => {
    const chave = chaveNova()
    const hash = hashPayload({ x: 1 })
    const ana = banco.contexto({ atorId: 'ana' })
    const beto = banco.contexto({ atorId: 'beto' })
    const a = await withIdempotency(ana, 'teste.escopo', chave, hash, () => Promise.resolve('ana'))
    const b = await withIdempotency(beto, 'teste.escopo', chave, hash, () =>
      Promise.resolve('beto'),
    )
    const c = await withIdempotency(ana, 'teste.outra', chave, hash, () => Promise.resolve('outra'))
    expect([a, b, c]).toEqual(['ana', 'beto', 'outra'])
    expect(
      await withIdempotency(ana, 'teste.escopo', chave, hash, () => Promise.resolve('NAO')),
    ).toBe('ana')
  })

  it('o resultado repetido é JSON puro (datas viram texto nas duas execuções)', async () => {
    const ctx = banco.contexto()
    const chave = chaveNova()
    const hash = hashPayload({ d: 1 })
    const fn = () => Promise.resolve({ quando: new Date('2027-01-31T15:00:00Z') })
    const primeiro = await withIdempotency(ctx, 'teste.json', chave, hash, fn)
    const segundo = await withIdempotency(ctx, 'teste.json', chave, hash, fn)
    expect(primeiro).toEqual({ quando: '2027-01-31T15:00:00.000Z' })
    expect(segundo).toEqual(primeiro)
  })

  it('o banco garante a unicidade e o formato do hash', async () => {
    const ctx = banco.contexto()
    const valores = {
      barbeariaId: ctx.barbeariaId,
      atorId: 'x',
      operacao: 'teste.db',
      chave: chaveNova(),
      hashPayload: hashPayload('x'),
    }
    await banco.db.insert(chavesIdempotencia).values(valores)
    await expect(banco.db.insert(chavesIdempotencia).values(valores)).rejects.toThrow()
    await expect(
      banco.db
        .insert(chavesIdempotencia)
        .values({ ...valores, chave: chaveNova(), hashPayload: 'curto' }),
    ).rejects.toThrow()
  })
})

describe('hashPayload', () => {
  it('é estável: ordem de chaves não importa; valores diferentes mudam o hash', () => {
    expect(hashPayload({ a: 1, b: { c: 2, d: 3 } })).toBe(hashPayload({ b: { d: 3, c: 2 }, a: 1 }))
    expect(hashPayload({ a: 1 })).not.toBe(hashPayload({ a: 2 }))
    expect(hashPayload({ a: 1 })).toMatch(/^[0-9a-f]{64}$/)
  })

  it('undefined é omitido; null, datas e bigint são distintos e determinísticos', () => {
    expect(hashPayload({ a: 1, b: undefined })).toBe(hashPayload({ a: 1 }))
    expect(hashPayload({ a: null })).not.toBe(hashPayload({}))
    expect(hashPayload({ d: new Date('2027-01-31T15:00:00Z') })).toBe(
      hashPayload({ d: '2027-01-31T15:00:00.000Z' }),
    )
    expect(hashPayload({ n: 10n })).toBe(hashPayload({ n: '10' }))
    expect(hashPayload([1, 2])).not.toBe(hashPayload([2, 1]))
  })
})
