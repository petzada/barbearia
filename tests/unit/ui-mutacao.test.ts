import { describe, expect, it } from 'vitest'
import type { ErrorResult, Result } from '~/contracts'
import {
  MutationController,
  fieldErrorsOf,
  networkError,
  type MutationState,
} from '~/ui/mutation/mutation-controller'

function erro(partes: Partial<ErrorResult> = {}): ErrorResult {
  return {
    status: 'error',
    code: 'SYSTEM.INTERNAL',
    message: 'Algo deu errado.',
    fields: [],
    retryable: false,
    correlationId: 'c-1',
    httpStatus: 500,
    ...partes,
  }
}

/** Ação controlável: cada chamada fica pendente até o teste resolvê-la. */
function acaoManual() {
  const chamadas: Array<{
    input: { nome: string }
    key: string
    resolver: (r: Result<{ id: string }>) => void
    rejeitar: (e: Error) => void
  }> = []
  const action = (input: { nome: string }, meta: { idempotencyKey: string }) =>
    new Promise<Result<{ id: string }>>((resolver, rejeitar) => {
      chamadas.push({ input, key: meta.idempotencyKey, resolver, rejeitar })
    })
  return { action, chamadas }
}

function criar() {
  const { action, chamadas } = acaoManual()
  let n = 0
  const controller = new MutationController<{ nome: string }, { id: string }>({
    action,
    newKey: () => `chave-${++n}`,
  })
  const fases: string[] = []
  controller.subscribe(() => fases.push(controller.getState().phase))
  return { controller, chamadas, fases }
}

describe('MutationController: estados de mutação (PRD §4.1)', () => {
  it('idle → enviando → confirmada só quando o servidor devolve ok', async () => {
    const { controller, chamadas, fases } = criar()
    expect(controller.getState().phase).toBe('idle')

    const envio = controller.submit({ nome: 'Ana' })
    expect(controller.getState().phase).toBe('sending')

    chamadas[0]?.resolver({ status: 'ok', data: { id: 'r1' }, revision: 3 })
    const final = await envio
    expect(final).toEqual({ phase: 'done', data: { id: 'r1' }, revision: 3 })
    expect(fases).toEqual(['sending', 'done'])
  })

  it('pendente externa guarda protocolo e próxima atualização, sem virar sucesso', async () => {
    const { controller, chamadas } = criar()
    const envio = controller.submit({ nome: 'Ana' })
    chamadas[0]?.resolver({
      status: 'pending',
      operationId: 'op-9',
      protocol: 'PROT-1',
      nextUpdateAt: '2026-10-19T15:00:00.000Z',
    })
    expect(await envio).toEqual({
      phase: 'pending',
      operationId: 'op-9',
      protocol: 'PROT-1',
      nextUpdateAt: '2026-10-19T15:00:00.000Z',
    })
  })

  it('conflito (HTTP 409) vira fase própria, distinta de falha', async () => {
    const { controller, chamadas } = criar()
    const envio = controller.submit({ nome: 'Ana' })
    const conflito = erro({ code: 'SCHEDULING.SLOT_UNAVAILABLE', httpStatus: 409 })
    chamadas[0]?.resolver(conflito)
    expect(await envio).toEqual({ phase: 'conflict', error: conflito })
  })

  it('isConflict customizado decide o que é conflito', async () => {
    const { action, chamadas } = acaoManual()
    const controller = new MutationController<{ nome: string }, { id: string }>({
      action,
      isConflict: (e) => e.code === 'PRICING.QUOTE_CHANGED',
    })
    const envio = controller.submit({ nome: 'Ana' })
    chamadas[0]?.resolver(erro({ code: 'PRICING.QUOTE_CHANGED', httpStatus: 422 }))
    expect((await envio).phase).toBe('conflict')
  })

  it('erro vira falha com a mensagem segura e os campos, e a entrada é preservada', async () => {
    const { controller, chamadas } = criar()
    const falha = erro({
      code: 'VALIDATION.FAILED',
      httpStatus: 422,
      fields: [{ path: 'nome', message: 'Muito curto.' }],
    })
    const envio = controller.submit({ nome: 'A' })
    chamadas[0]?.resolver(falha)
    const final = await envio
    expect(final).toEqual({ phase: 'failed', error: falha })
    expect(controller.lastInput).toEqual({ nome: 'A' })
    expect(fieldErrorsOf(final)).toEqual({ nome: 'Muito curto.' })
  })

  it('exceção de rede vira falha retentável, nunca sucesso', async () => {
    const { controller, chamadas } = criar()
    const envio = controller.submit({ nome: 'Ana' })
    chamadas[0]?.rejeitar(new Error('offline'))
    const final = await envio
    expect(final).toEqual({ phase: 'failed', error: networkError() })
    expect(networkError().retryable).toBe(true)
  })

  it('fieldErrorsOf fica vazio fora de falha e conflito', () => {
    const estados: MutationState<unknown>[] = [
      { phase: 'idle' },
      { phase: 'sending' },
      { phase: 'done', data: 1, revision: null },
    ]
    for (const e of estados) expect(fieldErrorsOf(e)).toEqual({})
  })
})

describe('MutationController: duplo envio e idempotência', () => {
  it('ignora submit enquanto há um em voo (uma só chamada ao servidor)', async () => {
    const { controller, chamadas } = criar()
    const primeiro = controller.submit({ nome: 'Ana' })
    const segundo = controller.submit({ nome: 'Ana' })
    const terceiro = controller.submit({ nome: 'Ana' })

    expect(chamadas).toHaveLength(1)
    expect(controller.ignoredSubmits).toBe(2)
    chamadas[0]?.resolver({ status: 'ok', data: { id: 'r1' }, revision: 1 })
    const [a, b, c] = await Promise.all([primeiro, segundo, terceiro])
    expect(a).toEqual(b)
    expect(b).toEqual(c)
  })

  it('retentativa com a mesma entrada reaproveita a chave de idempotência', async () => {
    const { controller, chamadas } = criar()
    const envio = controller.submit({ nome: 'Ana' })
    chamadas[0]?.resolver(erro({ retryable: true, httpStatus: 503 }))
    await envio

    const nova = controller.retry()
    chamadas[1]?.resolver({ status: 'ok', data: { id: 'r1' }, revision: 1 })
    await nova
    expect(chamadas.map((c) => c.key)).toEqual(['chave-1', 'chave-1'])
  })

  it('entrada diferente gera chave nova (a chave só vale para o mesmo payload)', async () => {
    const { controller, chamadas } = criar()
    const envio = controller.submit({ nome: 'A' })
    chamadas[0]?.resolver(erro({ code: 'VALIDATION.FAILED', httpStatus: 422 }))
    await envio

    const corrigido = controller.submit({ nome: 'Ana' })
    chamadas[1]?.resolver({ status: 'ok', data: { id: 'r1' }, revision: 1 })
    await corrigido
    expect(chamadas.map((c) => c.key)).toEqual(['chave-1', 'chave-2'])
  })

  it('depois de confirmar, repetir a mesma entrada é uma nova intenção (chave nova)', async () => {
    const { controller, chamadas } = criar()
    const a = controller.submit({ nome: 'Ana' })
    chamadas[0]?.resolver({ status: 'ok', data: { id: 'r1' }, revision: 1 })
    await a
    const b = controller.submit({ nome: 'Ana' })
    chamadas[1]?.resolver({ status: 'ok', data: { id: 'r2' }, revision: 2 })
    await b
    expect(chamadas.map((c) => c.key)).toEqual(['chave-1', 'chave-2'])
  })

  it('a ordem das propriedades da entrada não muda a chave', async () => {
    const { action, chamadas } = acaoManual()
    let n = 0
    const controller = new MutationController<Record<string, unknown>, { id: string }>({
      action: (i, m) => action(i as { nome: string }, m),
      newKey: () => `k${++n}`,
    })
    const a = controller.submit({ x: 1, y: { b: 2, c: 3 } })
    chamadas[0]?.resolver(erro({ retryable: true }))
    await a
    const b = controller.submit({ y: { c: 3, b: 2 }, x: 1 })
    chamadas[1]?.resolver({ status: 'ok', data: { id: 'r' }, revision: null })
    await b
    expect(chamadas.map((c) => c.key)).toEqual(['k1', 'k1'])
  })

  it('reset volta ao repouso e encerra a intenção; durante o envio não faz nada', async () => {
    const { controller, chamadas } = criar()
    const envio = controller.submit({ nome: 'Ana' })
    controller.reset()
    expect(controller.getState().phase).toBe('sending')

    chamadas[0]?.resolver(erro({ retryable: true }))
    await envio
    controller.reset()
    expect(controller.getState()).toEqual({ phase: 'idle' })
    expect(controller.lastInput).toBeUndefined()

    const novo = controller.submit({ nome: 'Ana' })
    chamadas[1]?.resolver({ status: 'ok', data: { id: 'r' }, revision: null })
    await novo
    expect(chamadas.map((c) => c.key)).toEqual(['chave-1', 'chave-2'])
  })

  it('retry sem envio anterior não chama o servidor', async () => {
    const { controller, chamadas } = criar()
    await controller.retry()
    expect(chamadas).toHaveLength(0)
  })
})
