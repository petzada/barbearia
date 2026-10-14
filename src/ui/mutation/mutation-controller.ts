import { newIdempotencyKey } from '~/contracts'
import type { ErrorResult, Result } from '~/contracts'

/** Estados de mutação do PRD §4.1. Só `done` significa que o servidor confirmou. */
export type MutationState<TData> =
  | { readonly phase: 'idle' }
  | { readonly phase: 'sending' }
  | { readonly phase: 'done'; readonly data: TData; readonly revision: number | null }
  | {
      readonly phase: 'pending'
      readonly operationId: string
      readonly protocol: string | null
      readonly nextUpdateAt: string | null
    }
  | { readonly phase: 'conflict'; readonly error: ErrorResult }
  | { readonly phase: 'failed'; readonly error: ErrorResult }

export interface MutationMeta {
  /** Uma chave por intenção: a mesma nas retentativas da mesma entrada, nova quando a entrada muda. */
  readonly idempotencyKey: string
}

export interface MutationOptions<TInput, TData> {
  /** Em geral uma `remoteOperation`: `(input, { idempotencyKey }) => op({ ...input, idempotencyKey })`. */
  action: (input: TInput, meta: MutationMeta) => Promise<Result<TData>>
  /** O que a tela trata como conflito (alternativas reais). Padrão: HTTP 409. */
  isConflict?: (error: ErrorResult) => boolean
  newKey?: () => string
}

/** Erro local para quando a chamada nem chegou ao servidor (rede caiu, timeout). */
export function networkError(): ErrorResult {
  return {
    status: 'error',
    code: 'CLIENT.NETWORK_FAILURE',
    message: 'Não foi possível falar com o servidor. Confira sua conexão e tente de novo.',
    fields: [],
    retryable: true,
    correlationId: '',
    httpStatus: 0,
  }
}

function stableStringify(valor: unknown): string {
  if (valor === undefined) return 'undefined'
  if (valor === null || typeof valor !== 'object') return JSON.stringify(valor)
  if (Array.isArray(valor)) return `[${valor.map(stableStringify).join(',')}]`
  const chaves = Object.keys(valor).sort()
  const partes = chaves.map(
    (k) => `${JSON.stringify(k)}:${stableStringify((valor as Record<string, unknown>)[k])}`,
  )
  return `{${partes.join(',')}}`
}

type Listener = () => void

/**
 * Máquina de estados de uma mutação, sem React (testável em Node). O hook `useMutation` a conecta à tela.
 *
 * - Enquanto uma chamada está em voo, novos `submit` são ignorados (bloqueio de duplo envio).
 * - A entrada enviada fica em `lastInput`: a tela nunca limpa o formulário por causa de um erro.
 * - Mesma entrada → mesma `idempotencyKey` (retentativa segura); entrada diferente ou nova intenção
 *   depois de `done`/`reset` → chave nova (PRD §7.3, D0055).
 */
export class MutationController<TInput, TData> {
  private state: MutationState<TData> = { phase: 'idle' }
  private lastInputValue: TInput | undefined
  private emVoo: Promise<MutationState<TData>> | null = null
  private intencao: { assinatura: string; chave: string } | null = null
  private readonly listeners = new Set<Listener>()
  /** Quantos envios foram descartados por já haver um em voo (útil para teste e métrica de UX). */
  ignoredSubmits = 0

  constructor(private options: MutationOptions<TInput, TData>) {}

  setOptions(options: MutationOptions<TInput, TData>): void {
    this.options = options
  }

  getState = (): MutationState<TData> => this.state

  get lastInput(): TInput | undefined {
    return this.lastInputValue
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  submit(input: TInput): Promise<MutationState<TData>> {
    if (this.emVoo) {
      this.ignoredSubmits += 1
      return this.emVoo
    }
    this.lastInputValue = input
    this.set({ phase: 'sending' })
    const chamada = this.executar(input).finally(() => {
      this.emVoo = null
    })
    this.emVoo = chamada
    return chamada
  }

  /** Repete a última entrada (mesma chave). Não faz nada se ainda não houve envio. */
  retry(): Promise<MutationState<TData>> {
    if (this.lastInputValue === undefined) return Promise.resolve(this.state)
    return this.submit(this.lastInputValue)
  }

  /** Volta ao repouso e encerra a intenção atual (o próximo envio usa chave nova). */
  reset(): void {
    if (this.emVoo) return
    this.intencao = null
    this.lastInputValue = undefined
    this.set({ phase: 'idle' })
  }

  private chaveDa(input: TInput): string {
    const assinatura = stableStringify(input)
    if (this.intencao?.assinatura !== assinatura) {
      this.intencao = { assinatura, chave: (this.options.newKey ?? newIdempotencyKey)() }
    }
    return this.intencao.chave
  }

  private async executar(input: TInput): Promise<MutationState<TData>> {
    const chave = this.chaveDa(input)
    let resultado: Result<TData>
    try {
      resultado = await this.options.action(input, { idempotencyKey: chave })
    } catch {
      return this.set({ phase: 'failed', error: networkError() })
    }
    switch (resultado.status) {
      case 'ok':
        // Intenção cumprida: um novo envio com a mesma entrada é outra intenção (outra chave).
        this.intencao = null
        return this.set({ phase: 'done', data: resultado.data, revision: resultado.revision })
      case 'pending':
        return this.set({
          phase: 'pending',
          operationId: resultado.operationId,
          protocol: resultado.protocol,
          nextUpdateAt: resultado.nextUpdateAt,
        })
      case 'error': {
        const conflito = (this.options.isConflict ?? ((e) => e.httpStatus === 409))(resultado)
        return this.set(
          conflito
            ? { phase: 'conflict', error: resultado }
            : { phase: 'failed', error: resultado },
        )
      }
    }
  }

  private set(proximo: MutationState<TData>): MutationState<TData> {
    this.state = proximo
    for (const l of this.listeners) l()
    return proximo
  }
}

/** `fields` do erro → mapa `caminho → mensagem` para os campos do formulário. */
export function fieldErrorsOf<TData>(state: MutationState<TData>): Record<string, string> {
  if (state.phase !== 'failed' && state.phase !== 'conflict') return {}
  const mapa: Record<string, string> = {}
  for (const f of state.error.fields) mapa[f.path] ??= f.message
  return mapa
}
