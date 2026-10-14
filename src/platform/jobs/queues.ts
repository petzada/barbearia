import { defineRetryPolicy, type RetryPolicy } from './retry'

export type DedupeMode = 'none' | 'by-key'

export interface QueueDefinition {
  readonly name: string
  readonly retry: RetryPolicy
  /**
   * `by-key`: no máximo um job AGUARDANDO por (fila, `singletonKey`) — `singletonKey` passa a ser obrigatório
   * (política `short` do pg-boss; enquanto um roda, outro pode ser agendado). `none`: sem dedupe e sem chave.
   */
  readonly dedupe: DedupeMode
  /** D0078: job de efeito externo (provedor, WhatsApp, push) fica pausado em modo recuperação. */
  readonly externalEffect: boolean
  readonly expireInSeconds: number
}

export interface QueueInput {
  readonly name: string
  readonly retry?: Partial<RetryPolicy>
  readonly dedupe?: DedupeMode
  readonly externalEffect?: boolean
  readonly expireInSeconds?: number
}

const NOME_VALIDO = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/
const definicoes = new Map<string, QueueDefinition>()

/** Nome no formato `modulo.acao` (minúsculas, números, `.`, `_`, `-`). */
export function defineQueue(input: QueueInput): QueueDefinition {
  if (!NOME_VALIDO.test(input.name)) {
    throw new Error(
      `Nome de fila inválido: "${input.name}" (use minúsculas, ex.: "agenda.lembrete").`,
    )
  }
  const definicao: QueueDefinition = {
    name: input.name,
    retry: defineRetryPolicy(input.retry),
    dedupe: input.dedupe ?? 'none',
    externalEffect: input.externalEffect ?? false,
    expireInSeconds: input.expireInSeconds ?? 15 * 60,
  }
  const existente = definicoes.get(input.name)
  if (existente) {
    if (JSON.stringify(existente) !== JSON.stringify(definicao)) {
      throw new Error(`A fila "${input.name}" já foi definida com outra configuração.`)
    }
    return existente
  }
  definicoes.set(input.name, definicao)
  return definicao
}

export function getQueueDefinition(name: string): QueueDefinition {
  const definicao = definicoes.get(name)
  if (!definicao) {
    throw new Error(`Fila "${name}" não foi definida: declare-a com defineQueue antes de usar.`)
  }
  return definicao
}

export function listQueueDefinitions(): readonly QueueDefinition[] {
  return [...definicoes.values()]
}

/** Só para testes. */
export function resetQueueDefinitions(): void {
  definicoes.clear()
}
